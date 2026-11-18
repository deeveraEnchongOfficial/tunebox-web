import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { Download } from '@prisma/client';

import { prisma } from '@/lib/db';
import { downloadYouTubeAudio } from '@/lib/download/yt-audio';
import { AppError } from '@/lib/errors/AppError';
import { ErrorCode } from '@/lib/errors/codes';
import { driveService } from '@/lib/services/drive-service';
import { optionalEnv } from '@/lib/utils/env';

const PENDING_STALE_MS = 5 * 60_000;
const PROCESSING_STALE_MS = 6 * 60_000;

function isStale(d: Download, now = Date.now()): boolean {
  if (d.status === 'PENDING') return now - d.createdAt.getTime() > PENDING_STALE_MS;
  if (d.status === 'PROCESSING') {
    const base = (d.startedAt ?? d.createdAt).getTime();
    return now - base > PROCESSING_STALE_MS;
  }
  return false;
}

async function ownedMusic(userId: string, musicId: string) {
  const music = await prisma.music.findUnique({ where: { id: musicId } });
  if (!music || music.userId !== userId) {
    throw new AppError({ code: ErrorCode.NOT_FOUND, message: 'Music not found.' });
  }
  return music;
}

async function latestDownload(musicId: string) {
  return prisma.download.findFirst({
    where: { musicId },
    orderBy: { createdAt: 'desc' },
  });
}

// Serverless instances die mid-job; rows stuck in PENDING/PROCESSING past
// the function timeout are orphans — mark them FAILED when touched.
async function sweepIfStale(download: Download | null): Promise<Download | null> {
  if (download && isStale(download)) {
    return prisma.download.update({
      where: { id: download.id },
      data: { status: 'FAILED', error: 'Interrupted' },
    });
  }
  return download;
}

export const downloadService = {
  async request(userId: string, musicId: string) {
    const music = await ownedMusic(userId, musicId);
    const existing = await sweepIfStale(await latestDownload(musicId));

    if (existing && existing.status !== 'FAILED' && existing.status !== 'DELETED') {
      return { download: existing, isNew: false };
    }

    const download = await prisma.download.create({
      data: {
        userId,
        musicId,
        sourceUrl: music.sourceUrl,
        status: 'PENDING',
      },
    });
    return { download, isNew: true };
  },

  async latest(userId: string, musicId: string) {
    await ownedMusic(userId, musicId);
    return sweepIfStale(await latestDownload(musicId));
  },

  // Self-contained job body — a future standalone worker can call this
  // unchanged.
  async process(downloadId: string): Promise<void> {
    const download = await prisma.download.findUnique({ where: { id: downloadId } });
    if (!download || (download.status !== 'PENDING' && download.status !== 'PROCESSING')) {
      return;
    }
    const music = await prisma.music.findUnique({ where: { id: download.musicId } });
    if (!music) {
      await prisma.download.update({
        where: { id: downloadId },
        data: { status: 'FAILED', error: 'Music record not found.' },
      });
      return;
    }

    await prisma.download.update({
      where: { id: downloadId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    const workDir = await mkdtemp(
      path.join(optionalEnv('DOWNLOAD_TMP_DIR', tmpdir()), 'tunebox-'),
    );
    try {
      driveService.ensureConfigured();
      const { filePath } = await downloadYouTubeAudio(music.sourceId, workDir);
      const { fileId, fileSize } = await driveService.uploadFile({
        filePath,
        name: `${music.title} [${music.sourceId}].mp3`,
        mimeType: 'audio/mpeg',
      });
      await prisma.download.update({
        where: { id: downloadId },
        data: {
          status: 'READY',
          storageKey: fileId,
          fileSize,
          mimeType: 'audio/mpeg',
          durationSeconds: music.durationSeconds,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)).slice(0, 300);
      await prisma.download.update({
        where: { id: downloadId },
        data: { status: 'FAILED', error: message },
      });
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  },

  async streamTarget(userId: string, musicId: string): Promise<{ fileId: string }> {
    await ownedMusic(userId, musicId);
    const latest = await latestDownload(musicId);
    if (!latest || latest.status !== 'READY' || !latest.storageKey) {
      throw new AppError({
        code: ErrorCode.DOWNLOAD_NOT_AVAILABLE,
        message: 'No downloaded file is available for this track yet.',
      });
    }
    return { fileId: latest.storageKey };
  },
};
