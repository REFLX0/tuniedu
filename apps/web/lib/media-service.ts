// =============================================================================
// TuniEdu Durable Media Service (server + worker)
// PostgreSQL-backed lifecycle for video lessons (upload -> transcode -> HLS) and
// live sessions (schedule -> LIVE -> recording -> replay), plus moderated chat
// and participant presence.
//
// Uses relative imports so it can be consumed by the standalone BullMQ workers
// (tsx does not resolve tsconfig path aliases).
// =============================================================================

import { randomUUID } from 'node:crypto';
import { prisma, ProcessingStatus, LiveStatus, Prisma } from '@tuniedu/database';
import { store } from './store';
import type { VideoContent, LiveSession, LiveChatMessage, User } from './store';

// ── Helpers ─────────────────────────────────────────────────────────────────

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

const PROFESSOR_NAMES: Record<string, string> = {
  prof_hichem_profile: 'Prof. Hichem Ben Salem',
  prof_aida_profile: 'Prof. Aida Triki',
  prof_moncef_profile: 'Prof. Moncef Gharbi',
};

function professorNameFor(professorId: string | null | undefined, bookId?: string): string {
  if (professorId && PROFESSOR_NAMES[professorId]) return PROFESSOR_NAMES[professorId];
  const book = bookId ? store.books.find((b) => b.id === bookId) : undefined;
  return book?.professorName ?? professorId ?? '';
}

// ── Video ───────────────────────────────────────────────────────────────────

type VideoRow = Prisma.VideoContentGetPayload<{ include: { qualities: true } }>;

export interface VideoQualityDto {
  resolution: string;
  manifestKey: string;
  bandwidthBps: number;
}

export type VideoRecordDto = VideoContent & {
  status: ProcessingStatus;
  processingError?: string | null;
  isPublished: boolean;
  qualities: VideoQualityDto[];
};

function toVideoDto(row: VideoRow): VideoRecordDto {
  return {
    id: row.id,
    bookId: row.bookId,
    chapterId: row.chapterId ?? undefined,
    professorId: row.professorId ?? '',
    professorName: row.professorName ?? professorNameFor(row.professorId, row.bookId),
    title: row.title,
    titleAr: row.titleAr ?? undefined,
    description: row.description ?? '',
    durationSeconds: row.durationSeconds ?? 0,
    isFreePreview: row.isFreePreview,
    thumbnailUrl: row.thumbnailKey ? `/api/videos/${row.id}/thumbnail` : '',
    masterPlaylistUrl: row.hlsManifestKey ? `/${row.hlsManifestKey}` : '',
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    processingError: row.processingError,
    isPublished: row.isPublished,
    qualities: row.qualities.map((q) => ({
      resolution: q.resolution,
      manifestKey: q.manifestKey,
      bandwidthBps: q.bandwidthBps,
    })),
  };
}

export interface CreateVideoRecordInput {
  bookId: string;
  chapterId?: string;
  professorId: string;
  professorName?: string;
  title: string;
  titleAr?: string;
  description?: string;
  durationSeconds?: number;
  isFreePreview?: boolean;
}

/** Creates a durable QUEUED video record. Returns the row plus its source S3 key. */
export async function createVideoRecord(
  input: CreateVideoRecordInput,
): Promise<{ video: VideoRecordDto; sourceObjectKey: string }> {
  const id = newId('vid');
  const originalObjectKey = `videos/${id}/source`;
  const row = await prisma.videoContent.create({
    data: {
      id,
      bookId: input.bookId,
      title: input.title,
      titleAr: input.titleAr ?? null,
      description: input.description ?? null,
      durationSeconds: input.durationSeconds ?? null,
      chapterId: input.chapterId ?? null,
      professorId: input.professorId,
      professorName: input.professorName ?? professorNameFor(input.professorId, input.bookId),
      isFreePreview: input.isFreePreview ?? false,
      originalObjectKey,
      status: ProcessingStatus.QUEUED,
    },
    include: { qualities: true },
  });
  return { video: toVideoDto(row), sourceObjectKey: originalObjectKey };
}

export async function getVideoRecord(id: string): Promise<VideoRecordDto | null> {
  const row = await prisma.videoContent.findUnique({ where: { id }, include: { qualities: true } });
  return row ? toVideoDto(row) : null;
}

/** Returns the original (source) object key for a video, or null when absent. */
export async function getVideoSourceKey(id: string): Promise<string | null> {
  const row = await prisma.videoContent.findUnique({
    where: { id },
    select: { originalObjectKey: true },
  });
  return row?.originalObjectKey ?? null;
}

export async function listVideoRecords(opts: {
  bookId?: string;
  professorId?: string;
  publishedOnly?: boolean;
} = {}): Promise<VideoRecordDto[]> {
  const rows = await prisma.videoContent.findMany({
    where: {
      ...(opts.bookId ? { bookId: opts.bookId } : {}),
      ...(opts.professorId ? { professorId: opts.professorId } : {}),
      ...(opts.publishedOnly ? { isPublished: true } : {}),
    },
    include: { qualities: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toVideoDto);
}

export async function markVideoProcessing(id: string): Promise<void> {
  await prisma.videoContent.update({
    where: { id },
    data: { status: ProcessingStatus.PROCESSING, processingError: null },
  });
}

export interface ReadyVideoInput {
  durationSeconds: number;
  hlsManifestKey: string;
  thumbnailKey?: string | null;
  checksumSha256?: string | null;
  fileSize?: number | null;
  qualities: Array<VideoQualityDto & { segmentCount?: number | null }>;
}

/** Atomically marks a video READY and replaces its quality ladder. */
export async function markVideoReady(id: string, input: ReadyVideoInput): Promise<VideoRecordDto> {
  const row = await prisma.$transaction(async (tx) => {
    await tx.videoQuality.deleteMany({ where: { videoId: id } });
    if (input.qualities.length > 0) {
      await tx.videoQuality.createMany({
        data: input.qualities.map((q) => ({
          videoId: id,
          resolution: q.resolution,
          manifestKey: q.manifestKey,
          bandwidthBps: q.bandwidthBps,
          segmentCount: q.segmentCount ?? null,
        })),
      });
    }
    return tx.videoContent.update({
      where: { id },
      data: {
        status: ProcessingStatus.READY,
        durationSeconds: input.durationSeconds,
        hlsManifestKey: input.hlsManifestKey,
        thumbnailKey: input.thumbnailKey ?? null,
        checksumSha256: input.checksumSha256 ?? null,
        fileSize:
          input.fileSize != null ? BigInt(Math.max(0, Math.floor(input.fileSize))) : null,
        isPublished: true,
        readyAt: new Date(),
        processingError: null,
      },
      include: { qualities: true },
    });
  });
  return toVideoDto(row);
}

export async function markVideoFailed(id: string, error: string): Promise<void> {
  await prisma.videoContent.update({
    where: { id },
    data: { status: ProcessingStatus.FAILED, processingError: error.slice(0, 500) },
  });
}

export async function incrementVideoViews(id: string): Promise<void> {
  await prisma.videoContent.update({ where: { id }, data: { viewCount: { increment: 1 } } });
}

// ── Live sessions ───────────────────────────────────────────────────────────

type LiveRow = Prisma.LiveSessionGetPayload<Record<string, never>>;

export type LiveRecordDto = LiveSession & {
  roomName: string;
  egressId: string | null;
  recordingStatus: string | null;
  recordingKey: string | null;
};

function toLiveDto(row: LiveRow): LiveRecordDto {
  const book = store.books.find((b) => b.id === row.bookId);
  return {
    id: row.id,
    bookId: row.bookId,
    bookTitle: book?.title ?? '',
    subject: row.subject ?? book?.subjectNameFr ?? 'Cours en direct',
    professorId: row.professorId,
    professorName: professorNameFor(row.professorId, row.bookId),
    title: row.title,
    titleAr: row.titleAr ?? undefined,
    description: row.description ?? '',
    scheduledAt: row.scheduledAt.toISOString(),
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    estimatedDurationMinutes: row.estimatedDurationMinutes ?? 60,
    status: row.status,
    priceMillimes: row.priceMillimes,
    isFreeForTrimesterStudents: row.isFreeForTrimesterStudents,
    replayVideoId: row.replayVideoId ?? null,
    viewerCount: row.viewerCount,
    maxParticipants: row.maxParticipants,
    currentParticipants: row.currentParticipants,
    pinnedMessage: row.pinnedMessage ?? null,
    roomName: row.roomName,
    egressId: row.egressId ?? null,
    recordingStatus: row.recordingStatus ?? null,
    recordingKey: row.recordingKey ?? null,
  };
}

export interface CreateLiveRecordInput {
  bookId: string;
  professorId: string;
  professorName?: string;
  title: string;
  titleAr?: string;
  description?: string;
  scheduledAt: string | Date;
  estimatedDurationMinutes?: number;
  priceMillimes: number;
  isFreeForTrimesterStudents?: boolean;
  subject?: string;
  maxParticipants?: number;
  pinnedMessage?: string;
}

export async function createLiveRecord(input: CreateLiveRecordInput): Promise<LiveRecordDto> {
  const id = newId('live');
  const row = await prisma.liveSession.create({
    data: {
      id,
      roomName: `live_${id}`,
      bookId: input.bookId,
      professorId: input.professorId,
      title: input.title,
      titleAr: input.titleAr ?? null,
      description: input.description ?? null,
      scheduledAt: new Date(input.scheduledAt),
      estimatedDurationMinutes: input.estimatedDurationMinutes ?? 60,
      priceMillimes: input.priceMillimes,
      isFreeForTrimesterStudents: input.isFreeForTrimesterStudents ?? true,
      subject: input.subject ?? null,
      maxParticipants: input.maxParticipants ?? 500,
      pinnedMessage: input.pinnedMessage ?? null,
      status: LiveStatus.SCHEDULED,
    },
  });
  return toLiveDto(row);
}

export async function getLiveRecord(id: string): Promise<LiveRecordDto | null> {
  const row = await prisma.liveSession.findUnique({ where: { id } });
  return row ? toLiveDto(row) : null;
}

export async function getLiveRecordByRoomName(roomName: string): Promise<LiveRecordDto | null> {
  const row = await prisma.liveSession.findUnique({ where: { roomName } });
  return row ? toLiveDto(row) : null;
}

export async function listLiveRecords(
  opts: { professorId?: string; bookId?: string } = {},
): Promise<LiveRecordDto[]> {
  const rows = await prisma.liveSession.findMany({
    where: {
      ...(opts.professorId ? { professorId: opts.professorId } : {}),
      ...(opts.bookId ? { bookId: opts.bookId } : {}),
    },
    orderBy: { scheduledAt: 'desc' },
  });
  return rows.map(toLiveDto);
}

export async function startLiveRecord(id: string): Promise<LiveRecordDto | null> {
  const row = await prisma.liveSession.update({
    where: { id },
    data: { status: LiveStatus.LIVE, startedAt: new Date() },
  });
  return toLiveDto(row);
}

export async function endLiveRecord(
  id: string,
  opts: { replayVideoId?: string; recordingKey?: string } = {},
): Promise<LiveRecordDto | null> {
  const row = await prisma.liveSession.update({
    where: { id },
    data: {
      status: LiveStatus.ENDED,
      endedAt: new Date(),
      ...(opts.replayVideoId ? { replayVideoId: opts.replayVideoId } : {}),
      ...(opts.recordingKey ? { recordingKey: opts.recordingKey } : {}),
    },
  });
  return toLiveDto(row);
}

export async function setLiveEgress(
  id: string,
  opts: { egressId?: string | null; recordingStatus?: string | null },
): Promise<void> {
  await prisma.liveSession.update({
    where: { id },
    data: {
      ...(opts.egressId !== undefined ? { egressId: opts.egressId } : {}),
      ...(opts.recordingStatus !== undefined ? { recordingStatus: opts.recordingStatus } : {}),
    },
  });
}

export async function updateLiveCounts(
  id: string,
  opts: { viewerCount?: number; currentParticipants?: number },
): Promise<void> {
  await prisma.liveSession.update({
    where: { id },
    data: {
      ...(opts.viewerCount !== undefined ? { viewerCount: opts.viewerCount } : {}),
      ...(opts.currentParticipants !== undefined ? { currentParticipants: opts.currentParticipants } : {}),
    },
  });
}

// ── Live chat ───────────────────────────────────────────────────────────────

function toChatDto(row: Prisma.LiveChatMessageGetPayload<Record<string, never>>): LiveChatMessage {
  return {
    id: row.id,
    liveSessionId: row.liveSessionId,
    userId: row.userId,
    userName: row.userName ?? '',
    userRole: (row.userRole as User['role']) ?? 'STUDENT',
    message: row.message,
    isQuestion: row.isQuestion,
    isPinned: row.isPinned,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createChatMessage(input: {
  liveSessionId: string;
  userId: string;
  userName: string;
  userRole: User['role'];
  message: string;
  isQuestion?: boolean;
  isPinned?: boolean;
}): Promise<LiveChatMessage> {
  const row = await prisma.liveChatMessage.create({
    data: {
      liveSessionId: input.liveSessionId,
      userId: input.userId,
      userName: input.userName,
      userRole: input.userRole,
      message: input.message,
      isQuestion: input.isQuestion ?? false,
      isPinned: input.isPinned ?? false,
      isApproved: true,
    },
  });
  return toChatDto(row);
}

export async function listChatMessages(
  liveSessionId: string,
  limit = 200,
): Promise<LiveChatMessage[]> {
  const rows = await prisma.liveChatMessage.findMany({
    where: { liveSessionId, isApproved: true, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  return rows.map(toChatDto);
}

// ── Live presence ───────────────────────────────────────────────────────────

export async function joinLiveParticipant(input: {
  liveSessionId: string;
  userId: string;
  entitlementId?: string | null;
}): Promise<void> {
  await prisma.liveParticipant.upsert({
    where: { liveSessionId_userId: { liveSessionId: input.liveSessionId, userId: input.userId } },
    update: { leftAt: null },
    create: {
      liveSessionId: input.liveSessionId,
      userId: input.userId,
      entitlementId: input.entitlementId ?? null,
    },
  });
}

export async function leaveLiveParticipant(input: {
  liveSessionId: string;
  userId: string;
}): Promise<void> {
  await prisma.liveParticipant.updateMany({
    where: { liveSessionId: input.liveSessionId, userId: input.userId },
    data: { leftAt: new Date() },
  });
}

export async function countLiveParticipants(liveSessionId: string): Promise<number> {
  return prisma.liveParticipant.count({ where: { liveSessionId, leftAt: null } });
}
