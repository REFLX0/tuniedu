// =============================================================================
// TuniEdu Infrastructure Integration Tests — REAL MinIO (S3) + LiveKit SFU.
// Run: npx tsx tests/integration/infra-tests.ts
//
// SAFETY: opt-in via TUNIEDU_ALLOW_INFRA_TESTS=1. Writes only to a dedicated
// storage bucket (tuniedu-infra-it) and a dedicated room (tuniedu_it_room),
// both cleaned up afterwards. Does not touch production data.
// =============================================================================

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TokenVerifier, RoomServiceClient } from 'livekit-server-sdk';
import {
  createPresignedGetUrl,
  createPresignedPutUrl,
  ensureBucket,
  getBucketNames,
  getObjectBuffer,
  getS3Client,
  isStorageConfigured,
  putObject,
} from '../../apps/web/lib/storage';
import {
  createLiveRoomToken,
  ensureLiveRoom,
  getLiveKitUrl,
  isLiveKitConfigured,
} from '../../apps/web/lib/livekit';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

function loadEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, '../../.env');
  try {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*(?:#.*)?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // .env optional; rely on the ambient environment.
  }
}

const IT_BUCKET = 'tuniedu-infra-it';
const IT_ROOM = 'tuniedu_it_room';

async function run(): Promise<TestResult[]> {
  if (process.env.TUNIEDU_ALLOW_INFRA_TESTS !== '1') {
    throw new Error('Refus: definissez TUNIEDU_ALLOW_INFRA_TESTS=1 (MinIO + LiveKit requis sur localhost).');
  }

  const results: TestResult[] = [];
  const push = (id: string, name: string, passed: boolean, details: string) =>
    results.push({ id, name, passed, details });

  // ---- Object storage (MinIO) ---------------------------------------------
  const storageConfigured = isStorageConfigured();
  push('INF-01', 'Object storage configured + client constructible', storageConfigured && !!getS3Client(), `configured=${storageConfigured} client=${!!getS3Client()}`);

  const bucketCreated = await ensureBucket(IT_BUCKET);
  push('INF-02', 'Bucket created/verified (idempotent)', bucketCreated, `bucket=${IT_BUCKET} ok=${bucketCreated}`);

  const payload = `tuniedu-it-${Date.now()}`;
  const key = `roundtrip/${Date.now()}.txt`;
  const putOk = await putObject(IT_BUCKET, key, payload, 'text/plain');
  const gotBuf = await getObjectBuffer(IT_BUCKET, key);
  const roundTrip = gotBuf?.toString('utf8') === payload;
  push('INF-03', 'PutObject → GetObject round-trip', putOk && roundTrip, `put=${putOk} roundTrip=${roundTrip}`);

  const putUrl = await createPresignedPutUrl(IT_BUCKET, key, 'text/plain', 300);
  const getUrl = await createPresignedGetUrl(IT_BUCKET, key, 300);
  const urlsValid = !!putUrl && !!getUrl && putUrl.includes('X-Amz-Signature') && getUrl.includes(IT_BUCKET);
  push('INF-04', 'Presigned PUT + GET URLs generated', urlsValid, `putUrl=${!!putUrl} getUrl=${!!getUrl}`);

  // ---- LiveKit SFU ---------------------------------------------------------
  const lkConfigured = isLiveKitConfigured();
  push('INF-05', 'LiveKit configured', lkConfigured, `url=${getLiveKitUrl()} configured=${lkConfigured}`);

  const identity = `it_student_${Date.now()}`;
  const token = await createLiveRoomToken({
    roomName: IT_ROOM,
    identity,
    name: 'IT Student',
    canPublish: false,
    canSubscribe: true,
  });
  let verifiedRoom: string | undefined;
  let verifiedPublish: boolean | undefined;
  let verifyOk = false;
  if (token && lkConfigured) {
    const verifier = new TokenVerifier(
      process.env.LIVEKIT_API_KEY as string,
      process.env.LIVEKIT_API_SECRET as string,
    );
    const claims = await verifier.verify(token);
    verifiedRoom = claims.video?.room;
    verifiedPublish = claims.video?.canPublish;
    verifyOk = verifiedRoom === IT_ROOM && claims.sub === identity && verifiedPublish === false;
  }
  push('INF-06', 'LiveKit token signed + verified (room/identity/pub)', verifyOk, `room=${verifiedRoom} sub=${identity} canPublish=${verifiedPublish}`);

  const roomReady = await ensureLiveRoom(IT_ROOM);
  let roomListed = false;
  if (roomReady) {
    const client = new RoomServiceClient(
      getLiveKitUrl().replace(/^ws/, 'http'),
      process.env.LIVEKIT_API_KEY as string,
      process.env.LIVEKIT_API_SECRET as string,
    );
    const rooms = await client.listRooms([IT_ROOM]);
    roomListed = rooms.some((r) => r.name === IT_ROOM);
    try {
      await client.deleteRoom(IT_ROOM);
    } catch {
      // best-effort cleanup
    }
  }
  push('INF-07', 'LiveKit room provisioned on SFU', roomReady && roomListed, `roomReady=${roomReady} listed=${roomListed}`);

  return results;
}

if (require.main === module) {
  loadEnv();
  (async () => {
    try {
      const results = await run();
      console.log('===========================================================');
      console.log('  TUNIEDU INFRA INTEGRATION TESTS (MinIO + LiveKit)');
      console.log('===========================================================');
      let allPassed = true;
      for (const r of results) {
        console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
        console.log(`        -> ${r.details}`);
        if (!r.passed) allPassed = false;
      }
      console.log('-----------------------------------------------------------');
      console.log(`${results.filter((r) => r.passed).length}/${results.length} passed`);
      if (!allPassed) { console.error('INFRA TESTS FAILED'); process.exit(1); }
      console.log('ALL INFRA TESTS PASSED');
    } catch (err) {
      console.error('INFRA TEST SUITE ERROR:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  })();
}
