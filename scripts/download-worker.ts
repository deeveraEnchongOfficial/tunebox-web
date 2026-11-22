// Local download worker — processes the persistent download queue from a
// machine on a trusted (residential) IP. Vercel's datacenter IPs get
// YouTube's bot wall; this worker doesn't. On Vercel set
// DOWNLOAD_RUNNER=external so the app only enqueues rows.
//
//   pnpm worker          (or: tsx scripts/download-worker.ts)
//
// Requires the same .env as the app (MongoDB + Drive credentials).

import { readFileSync } from 'node:fs';
import path from 'node:path';

// Load .env like Next does (no dotenv dep).
try {
  for (const line of readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?/.exec(line);
    if (m && m[1] && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {
  /* .env optional — env vars may come from the shell */
}

const { downloadService } = await import('../lib/services/download-service');
const { prisma } = await import('../lib/db');

const POLL_MS = 10_000;
const RETRY_COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 3;

// Only IP-block / throttling signatures are worth retrying from a trusted
// IP — content failures (age-gated, deleted, private) fail identically here.
const RETRYABLE = /not a bot|403|forbidden|unable to download|no video formats|interrupted|timed out/i;

const attempts = new Map<string, number>();
let stopping = false;

async function tick() {
  // New work — claimed atomically inside process().
  const pending = await prisma.download.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });
  for (const d of pending) {
    if (stopping) return;
    console.log(`[worker] processing ${d.id} (${d.sourceUrl})`);
    await downloadService.process(d.id).catch((e) => console.error(`[worker] ${d.id}:`, e));
  }

  // Rows a serverless attempt already failed with an IP-block signature —
  // retryable from this trusted IP, with a cooldown and attempt cap.
  const failed = await prisma.download.findMany({
    where: { status: 'FAILED' },
    orderBy: { createdAt: 'asc' },
  });
  for (const d of failed) {
    if (stopping) return;
    if (!RETRYABLE.test(d.error ?? '')) continue;
    if ((attempts.get(d.id) ?? 0) >= MAX_ATTEMPTS) continue;
    const lastTouched = d.completedAt ?? d.startedAt ?? d.createdAt;
    if (Date.now() - lastTouched.getTime() < RETRY_COOLDOWN_MS) continue;

    const requeued = await prisma.download.updateMany({
      where: { id: d.id, status: 'FAILED' },
      data: { status: 'PENDING', progress: 0, error: null },
    });
    if (requeued.count === 0) continue;
    attempts.set(d.id, (attempts.get(d.id) ?? 0) + 1);
    console.log(`[worker] retrying ${d.id} (${d.sourceUrl})`);
    await downloadService.process(d.id).catch((e) => console.error(`[worker] ${d.id}:`, e));
  }
}

async function main() {
  console.log('[worker] download worker started — Ctrl-C to stop');
  process.on('SIGINT', () => {
    stopping = true;
    console.log('\n[worker] stopping after current job…');
  });
  while (!stopping) {
    await tick().catch((e) => console.error('[worker] tick failed:', e));
    if (!stopping) await new Promise((r) => setTimeout(r, POLL_MS));
  }
  await prisma.$disconnect();
}

await main();
