// =============================================================================
// TuniEdu LiveKit Webhook API: POST /api/lives/webhook
// SEC-07/SEC-21: Validates LiveKit webhook signature and persists egress events
// into Prisma (marks LiveSession recording/replay status).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyLiveKitWebhook } from '@/lib/livekit';
import { getLiveRecordByRoomName, setLiveEgress, endLiveRecord } from '@/lib/media-service';
import { createVideoRecord, markVideoProcessing } from '@/lib/media-service';
import { ensureBookMirror } from '@/lib/catalog-mirror';
import { enqueueVideoTranscode } from '@/lib/queue';
import { getBucketNames, getObjectBuffer, putObject } from '@/lib/storage';
import { EgressStatus } from '@livekit/protocol';

function parseDurationMsToSeconds(ms: bigint | number | undefined): number | undefined {
  const m = ms as unknown as bigint;
  if (m === undefined) return undefined;
  try {
    const secs = Number(m) / 1000;
    return secs > 0 ? Math.floor(secs) : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const rawBody = await req.text();

    const event = await verifyLiveKitWebhook(rawBody, authHeader);
    if (!event) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const evt = event.event;
    console.log(`[livekit-webhook] ${evt}`);

    // Egress started: update recording status.
    if (evt === 'egress_started') {
      const info = event.egressInfo;
      if (info?.roomName) {
        const live = await getLiveRecordByRoomName(info.roomName);
        if (live) {
          await setLiveEgress(live.id, {
            egressId: info.egressId ?? null,
            recordingStatus: 'ACTIVE',
          });
        }
      }
    }

    // Egress ended: set recording status; if there is a file result in S3,
    // attempt to create a replay VideoContent and enqueue HLS transcode.
    if (evt === 'egress_ended') {
      const info = event.egressInfo;
      if (info?.roomName) {
        const live = await getLiveRecordByRoomName(info.roomName);
        if (live) {
          // EgressStatus: 0 STARTING, 1 ACTIVE, 2 ENDING, 3 COMPLETE, 4 FAILED, 5 ABORTED
          const failed =
            info.status === EgressStatus.EGRESS_FAILED ||
            info.status === EgressStatus.EGRESS_ABORTED;
          await setLiveEgress(live.id, {
            egressId: info.egressId ?? null,
            recordingStatus: failed ? 'FAILED' : 'COMPLETE',
          });

          // Only promote a replay when the recording actually completed with a file.
          const file = failed ? undefined : info.fileResults?.[0];
          if (file?.filename) {
            const filepath = file.filename; // e.g. replays/<liveId>/live.mp4

            await ensureBookMirror(live.bookId);
            const { video: replayVideo, sourceObjectKey } = await createVideoRecord({
              bookId: live.bookId,
              professorId: live.professorId,
              professorName: live.professorName,
              title: `[Replay VOD] ${live.title}`,
              titleAr: live.titleAr ? `[تسجيل] ${live.titleAr}` : undefined,
              description: `Replay automatique de la séance en direct. ${live.description || ''}`.slice(0, 500),
              durationSeconds: parseDurationMsToSeconds(file.duration),
              isFreePreview: live.isFreeForTrimesterStudents,
            });

            // Materialise the recording under the video's canonical source key so
            // the transcode worker can consume it, then enqueue the transcode.
            const recorded = await getObjectBuffer(getBucketNames().videos, filepath);
            if (recorded) {
              await putObject(getBucketNames().videos, sourceObjectKey, recorded, 'video/mp4');
              await markVideoProcessing(replayVideo.id);
              await enqueueVideoTranscode({
                videoId: replayVideo.id,
                sourceObjectKey,
                title: replayVideo.title,
                professorId: replayVideo.professorId,
              });
            }

            await endLiveRecord(live.id, { replayVideoId: replayVideo.id, recordingKey: filepath });
            return NextResponse.json({ ok: true, replayId: replayVideo.id });
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[livekit-webhook] error:', err instanceof Error ? err.message : err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
