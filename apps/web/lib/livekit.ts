// =============================================================================
// TuniEdu LiveKit Adapter (SEC-19, SEC-24)
// Real WebRTC room tokens + room provisioning against a LiveKit SFU.
// Fails SOFT: when LiveKit is not configured, callers fall back to the signed
// media token so local development still works without an SFU.
//
// Configuration (see .env.example):
//   LIVEKIT_URL         e.g. http://localhost:7880 (compose) or wss://... in prod
//   LIVEKIT_API_KEY
//   LIVEKIT_API_SECRET
// =============================================================================

import {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  WebhookReceiver,
  type WebhookEvent,
} from 'livekit-server-sdk';
import { EncodedFileOutput, S3Upload, EncodedFileType } from '@livekit/protocol';

const DEFAULT_LIVEKIT_URL = 'http://localhost:7880';
const ROOM_TOKEN_TTL_SECONDS = 15 * 60;

export function isLiveKitConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET,
  );
}

export function getLiveKitUrl(): string {
  return (process.env.LIVEKIT_URL || DEFAULT_LIVEKIT_URL).replace(/\/+$/, '');
}

function getHttpUrl(): string {
  return getLiveKitUrl().replace(/^ws/, 'http');
}

export interface LiveRoomTokenParams {
  roomName: string;
  identity: string;
  name: string;
  canPublish: boolean;
  canSubscribe?: boolean;
}

/**
 * Issues a short-lived LiveKit room-join JWT. Returns null when LiveKit is not
 * configured or the token cannot be generated.
 */
export async function createLiveRoomToken(params: LiveRoomTokenParams): Promise<string | null> {
  if (!isLiveKitConfigured()) return null;
  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY as string,
      process.env.LIVEKIT_API_SECRET as string,
      { identity: params.identity, name: params.name, ttl: ROOM_TOKEN_TTL_SECONDS },
    );
    at.addGrant({
      room: params.roomName,
      roomJoin: true,
      canPublish: params.canPublish,
      canSubscribe: params.canSubscribe ?? true,
    });
    return await at.toJwt();
  } catch (err) {
    console.error('[livekit] token generation failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Idempotently ensures the room exists on the SFU. Returns false when LiveKit
 * is not configured or provisioning fails (non-fatal).
 */
export async function ensureLiveRoom(roomName: string): Promise<boolean> {
  if (!isLiveKitConfigured()) return false;
  try {
    const client = new RoomServiceClient(
      getHttpUrl(),
      process.env.LIVEKIT_API_KEY as string,
      process.env.LIVEKIT_API_SECRET as string,
    );
    const rooms = await client.listRooms([roomName]);
    if (!rooms || rooms.length === 0) {
      await client.createRoom({ name: roomName });
    }
    return true;
  } catch (err) {
    console.error('[livekit] ensureLiveRoom failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

// ── Egress recording (room-composite MP4 → MinIO → HLS replay) ───────────────

/** Egress needs both the SFU credentials and S3 object-storage credentials. */
export function isEgressConfigured(): boolean {
  return Boolean(
    isLiveKitConfigured() &&
      process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY,
  );
}

function buildS3Upload(): S3Upload {
  // The egress container runs inside Docker, so it must reach MinIO over the
  // compose network (`http://minio:9000`) rather than the host-mapped address.
  const endpoint =
    process.env.S3_ENDPOINT_EGRESS || process.env.S3_ENDPOINT || 'http://minio:9000';
  return new S3Upload({
    accessKey: process.env.S3_ACCESS_KEY as string,
    secret: process.env.S3_SECRET_KEY as string,
    region: process.env.S3_REGION || 'us-east-1',
    endpoint,
    bucket: process.env.S3_BUCKET_VIDEOS || 'tuniedu-videos-hls',
    forcePathStyle: true,
  });
}

export interface RoomRecording {
  egressId: string;
  /** Object key (relative to the videos bucket) where the MP4 will land. */
  filepath: string;
}

/**
 * Starts a room-composite MP4 recording that uploads straight into the videos
 * bucket. Returns null (fail-soft) when egress/storage is not configured or the
 * egress service is unreachable.
 */
export async function startRoomRecording(
  roomName: string,
  filepath: string,
): Promise<RoomRecording | null> {
  if (!isEgressConfigured()) return null;
  try {
    const client = new EgressClient(
      getHttpUrl(),
      process.env.LIVEKIT_API_KEY as string,
      process.env.LIVEKIT_API_SECRET as string,
    );
    const file = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath,
      output: { case: 's3', value: buildS3Upload() },
    });
    const info = await client.startRoomCompositeEgress(roomName, file);
    if (!info.egressId) return null;
    return { egressId: info.egressId, filepath };
  } catch (err) {
    console.error('[livekit] startRoomRecording failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Stops an active egress by id. Best-effort. */
export async function stopRoomRecording(egressId: string): Promise<boolean> {
  if (!isLiveKitConfigured()) return false;
  try {
    const client = new EgressClient(
      getHttpUrl(),
      process.env.LIVEKIT_API_KEY as string,
      process.env.LIVEKIT_API_SECRET as string,
    );
    await client.stopEgress(egressId);
    return true;
  } catch (err) {
    console.error('[livekit] stopRoomRecording failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Verifies a LiveKit webhook (signed JWT in the Authorization header) and returns
 * the decoded event. Returns null when LiveKit is unconfigured or the signature
 * is invalid — callers must fail closed on null.
 */
export async function verifyLiveKitWebhook(
  body: string,
  authHeader: string | null,
): Promise<WebhookEvent | null> {
  if (!isLiveKitConfigured() || !authHeader) return null;
  try {
    const receiver = new WebhookReceiver(
      process.env.LIVEKIT_API_KEY as string,
      process.env.LIVEKIT_API_SECRET as string,
    );
    return await receiver.receive(body, authHeader);
  } catch (err) {
    console.error('[livekit] webhook verification failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
