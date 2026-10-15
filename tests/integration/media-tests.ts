// =============================================================================
// TuniEdu Media Pipeline Integration Tests — REAL ffmpeg HLS + REAL pdf-lib.
// Run: npx tsx tests/integration/media-tests.ts
//
// SAFETY: opt-in via TUNIEDU_ALLOW_INFRA_TESTS=1. Runs entirely on a temp
// directory with ffmpeg-generated fixtures; no network or production data.
// =============================================================================

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { isFfmpegAvailable, transcodeVideoWorker } from '../../workers/video-transcoding';
import { processPdfWorker, renderPdfPagesToWebp } from '../../workers/book-processing';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

function makeSampleVideo(): Buffer | null {
  const dir = mkdtempSync(join(tmpdir(), 'tuniedu-fixture-'));
  const out = join(dir, 'sample.mp4');
  const res = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-f', 'lavfi',
      '-i', 'testsrc=duration=2:size=640x360:rate=25',
      '-pix_fmt', 'yuv420p',
      out,
    ],
    { stdio: 'ignore' },
  );
  let buf: Buffer | null = null;
  if (res.status === 0 && existsSync(out)) buf = readFileSync(out);
  rmSync(dir, { recursive: true, force: true });
  return buf;
}

async function run(): Promise<TestResult[]> {
  if (process.env.TUNIEDU_ALLOW_INFRA_TESTS !== '1') {
    throw new Error('Refus: definissez TUNIEDU_ALLOW_INFRA_TESTS=1 (ffmpeg + pdf-lib requis).');
  }

  const results: TestResult[] = [];
  const push = (id: string, name: string, passed: boolean, details: string) =>
    results.push({ id, name, passed, details });

  // ---- ffmpeg transcode ladder --------------------------------------------
  push('MED-01', 'ffmpeg binary detected on PATH', isFfmpegAvailable(), `available=${isFfmpegAvailable()}`);

  const sample = makeSampleVideo();
  push('MED-02', 'ffmpeg fixture generated (testsrc h264 mp4)', !!sample && sample.length > 0, `bytes=${sample?.length ?? 0}`);

  if (sample) {
    const result = await transcodeVideoWorker({
      videoId: `it_${Date.now()}`,
      sourceObjectKey: 'it/source.mp4',
      title: 'IT Sample',
      professorId: 'it_prof',
      fileBuffer: sample,
    });

    const outDir = result.localOutputDir;
    const masterOk = !!outDir && existsSync(join(outDir, 'master.m3u8'));
    const variants = result.qualities.map((q) =>
      !!outDir && existsSync(join(outDir, q.resolution, 'index.m3u8')),
    );
    const allVariants = variants.length > 0 && variants.every(Boolean);

    push(
      'MED-03',
      'REAL HLS transcode: master + all renditions produced',
      result.success && result.real === true && masterOk && allVariants,
      `real=${result.real} duration=${result.durationSeconds.toFixed(2)}s master=${masterOk} variants=${variants.filter(Boolean).length}/${variants.length}`,
    );

    push(
      'MED-04',
      'REAL ffprobe duration read from source (> 0)',
      result.durationSeconds > 0,
      `duration=${result.durationSeconds.toFixed(3)}s`,
    );

    if (result.localOutputDir) rmSync(result.localOutputDir, { recursive: true, force: true });
  }

  // ---- real PDF page count -------------------------------------------------
  const pdf = await PDFDocument.create();
  pdf.addPage();
  pdf.addPage();
  pdf.addPage();
  pdf.addPage();
  const pdfBytes = await pdf.save();

  const pdfResult = await processPdfWorker({
    bookId: `it_book_${Date.now()}`,
    versionNumber: 1,
    originalObjectKey: 'it/book.pdf',
    fileBuffer: Buffer.from(pdfBytes),
  });

  push(
    'MED-05',
    'REAL PDF page count parsed via pdf-lib',
    pdfResult.success && pdfResult.real === true && pdfResult.pageCount === 4,
    `real=${pdfResult.real} pageCount=${pdfResult.pageCount} (expected 4) pages=${pdfResult.pages.length}`,
  );

  // ---- REAL PDF rasterisation to WebP (pdfjs-dist + @napi-rs/canvas) -------
  try {
    const rendered = await renderPdfPagesToWebp(Buffer.from(pdfBytes), { scale: 1, maxPages: 2 });
    const first = rendered.pages[0];
    const isWebp =
      !!first && first.webp.length > 12 && first.webp.subarray(0, 4).toString('ascii') === 'RIFF' &&
      first.webp.subarray(8, 12).toString('ascii') === 'WEBP';
    push(
      'MED-06',
      'REAL PDF pages rasterised to WebP via pdfjs + canvas',
      rendered.pageCount === 4 &&
        rendered.pages.length === 2 &&
        isWebp &&
        first.width > 0 &&
        first.height > 0,
      `pageCount=${rendered.pageCount} rendered=${rendered.pages.length} webp=${isWebp} size=${first?.width ?? 0}x${first?.height ?? 0} bytes=${first?.webp.length ?? 0}`,
    );
  } catch (err) {
    push('MED-06', 'REAL PDF pages rasterised to WebP via pdfjs + canvas', false, `error=${err instanceof Error ? err.message : String(err)}`);
  }

  return results;
}

if (require.main === module) {
  (async () => {
    try {
      const results = await run();
      console.log('===========================================================');
      console.log('  TUNIEDU MEDIA INTEGRATION TESTS (ffmpeg + pdf-lib)');
      console.log('===========================================================');
      let allPassed = true;
      for (const r of results) {
        console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
        console.log(`        -> ${r.details}`);
        if (!r.passed) allPassed = false;
      }
      console.log('-----------------------------------------------------------');
      console.log(`${results.filter((r) => r.passed).length}/${results.length} passed`);
      if (!allPassed) { console.error('MEDIA TESTS FAILED'); process.exit(1); }
      console.log('ALL MEDIA TESTS PASSED');
    } catch (err) {
      console.error('MEDIA TEST SUITE ERROR:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  })();
}
