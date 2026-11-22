import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  music: { findUnique: vi.fn(), findMany: vi.fn() },
  download: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));

const driveMock = vi.hoisted(() => ({
  ensureConfigured: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));

const ytMock = vi.hoisted(() => ({
  downloadYouTubeAudio: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/services/drive-service', () => ({ driveService: driveMock }));
vi.mock('@/lib/download/yt-audio', () => ytMock);

import { downloadService } from '@/lib/services/download-service';
import { musicService, serializeMusic } from '@/lib/services/music-service';
import { AppError } from '@/lib/errors/AppError';
import type { Download, Music } from '@prisma/client';

let tmpDir: string;

function mkMusic(overrides: Partial<Music> = {}): Music {
  return {
    id: 'music-1',
    userId: 'user-1',
    sourceType: 'YOUTUBE',
    sourceId: 'vid1',
    sourceUrl: 'https://www.youtube.com/watch?v=vid1',
    title: 'Song',
    artist: null,
    channelName: null,
    thumbnailUrl: null,
    durationSeconds: 200,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Music;
}

function mkDownload(overrides: Partial<Download> = {}): Download {
  return {
    id: 'dl-1',
    userId: 'user-1',
    musicId: 'music-1',
    sourceUrl: 'https://www.youtube.com/watch?v=vid1',
    storageKey: null,
    fileSize: null,
    durationSeconds: null,
    mimeType: null,
    checksum: null,
    status: 'PENDING',
    error: null,
    startedAt: null,
    createdAt: new Date(),
    completedAt: null,
    ...overrides,
  } as Download;
}

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60_000);
}

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'dl-test-'));
  process.env.DOWNLOAD_TMP_DIR = tmpDir;
  vi.clearAllMocks();
  prismaMock.music.findUnique.mockResolvedValue(mkMusic());
});

afterEach(() => {
  delete process.env.DOWNLOAD_TMP_DIR;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('request', () => {
  it('creates a PENDING download and reports isNew', async () => {
    prismaMock.download.findFirst.mockResolvedValue(null);
    const created = mkDownload();
    prismaMock.download.create.mockResolvedValue(created);

    const res = await downloadService.request('user-1', 'music-1');

    expect(res).toEqual({ download: created, isNew: true });
    expect(prismaMock.download.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          musicId: 'music-1',
          sourceUrl: 'https://www.youtube.com/watch?v=vid1',
          status: 'PENDING',
        }),
      }),
    );
  });

  it.each(['PENDING', 'PROCESSING', 'READY'] as const)(
    'dedupes when latest is %s',
    async (status) => {
      const existing = mkDownload({ status, startedAt: new Date() });
      prismaMock.download.findFirst.mockResolvedValue(existing);

      const res = await downloadService.request('user-1', 'music-1');

      expect(res).toEqual({ download: existing, isNew: false });
      expect(prismaMock.download.create).not.toHaveBeenCalled();
    },
  );

  it('creates a fresh row when latest is FAILED', async () => {
    prismaMock.download.findFirst.mockResolvedValue(mkDownload({ status: 'FAILED' }));
    prismaMock.download.create.mockResolvedValue(mkDownload({ id: 'dl-2' }));

    const res = await downloadService.request('user-1', 'music-1');

    expect(res.isNew).toBe(true);
    expect(prismaMock.download.create).toHaveBeenCalled();
  });

  it('marks a stale PENDING row FAILED then creates a new one', async () => {
    const stale = mkDownload({ status: 'PENDING', createdAt: minutesAgo(10) });
    prismaMock.download.findFirst.mockResolvedValue(stale);
    prismaMock.download.create.mockResolvedValue(mkDownload({ id: 'dl-2' }));

    const res = await downloadService.request('user-1', 'music-1');

    expect(prismaMock.download.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dl-1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    expect(res.isNew).toBe(true);
  });

  it('marks a stale PROCESSING row FAILED then creates a new one', async () => {
    const stale = mkDownload({ status: 'PROCESSING', startedAt: minutesAgo(10) });
    prismaMock.download.findFirst.mockResolvedValue(stale);
    prismaMock.download.create.mockResolvedValue(mkDownload({ id: 'dl-2' }));

    await downloadService.request('user-1', 'music-1');

    expect(prismaMock.download.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'dl-1' } }),
    );
  });

  it('does NOT sweep a fresh PROCESSING row', async () => {
    const fresh = mkDownload({ status: 'PROCESSING', startedAt: minutesAgo(1) });
    prismaMock.download.findFirst.mockResolvedValue(fresh);

    const res = await downloadService.request('user-1', 'music-1');

    expect(prismaMock.download.update).not.toHaveBeenCalled();
    expect(res.isNew).toBe(false);
  });

  it('throws NOT_FOUND for another user’s music', async () => {
    prismaMock.music.findUnique.mockResolvedValue(mkMusic({ userId: 'other' }));

    await expect(downloadService.request('user-1', 'music-1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('latest', () => {
  it('returns null with no downloads', async () => {
    prismaMock.download.findFirst.mockResolvedValue(null);
    expect(await downloadService.latest('user-1', 'music-1')).toBeNull();
  });

  it('sweeps a stale row before returning it', async () => {
    const stale = mkDownload({ status: 'PENDING', createdAt: minutesAgo(10) });
    prismaMock.download.findFirst.mockResolvedValue(stale);
    prismaMock.download.update.mockResolvedValue({ ...stale, status: 'FAILED' });

    const res = await downloadService.latest('user-1', 'music-1');

    expect(prismaMock.download.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dl-1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    expect(res?.status).toBe('FAILED');
  });
});

describe('process', () => {
  it('runs the happy path: claim → upload → READY, temp cleaned', async () => {
    prismaMock.download.findUnique.mockResolvedValue(mkDownload());
    prismaMock.download.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.download.findFirst.mockResolvedValue(mkDownload({ id: 'dl-1' }));
    prismaMock.download.update.mockImplementation(() => Promise.resolve(mkDownload()));
    const mp3Path = path.join(tmpDir, 'vid1.mp3');
    writeFileSync(mp3Path, 'mp3data');
    ytMock.downloadYouTubeAudio.mockResolvedValue({ filePath: mp3Path, fileSize: 7 });
    driveMock.uploadFile.mockResolvedValue({ fileId: 'drive-1', fileSize: 7 });

    await downloadService.process('dl-1');

    expect(prismaMock.download.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dl-1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'PROCESSING', startedAt: expect.any(Date) }),
      }),
    );
    expect(ytMock.downloadYouTubeAudio).toHaveBeenCalledWith(
      'vid1',
      expect.any(String),
      expect.any(Function),
    );
    expect(driveMock.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: mp3Path,
        mimeType: 'audio/mpeg',
        name: expect.stringContaining('vid1'),
      }),
    );
    expect(prismaMock.download.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'READY',
          storageKey: 'drive-1',
          fileSize: 7,
          mimeType: 'audio/mpeg',
          completedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('marks FAILED with the error message when the downloader throws', async () => {
    prismaMock.download.findUnique.mockResolvedValue(mkDownload());
    prismaMock.download.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.download.findFirst.mockResolvedValue(mkDownload({ id: 'dl-1' }));
    ytMock.downloadYouTubeAudio.mockRejectedValue(new Error('bot check'));

    await downloadService.process('dl-1');

    expect(prismaMock.download.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED', error: expect.stringContaining('bot check') }),
      }),
    );
    expect(driveMock.uploadFile).not.toHaveBeenCalled();
  });

  it('does nothing when the row is already READY', async () => {
    prismaMock.download.findUnique.mockResolvedValue(mkDownload({ status: 'READY' }));

    await downloadService.process('dl-1');

    expect(ytMock.downloadYouTubeAudio).not.toHaveBeenCalled();
    expect(prismaMock.download.update).not.toHaveBeenCalled();
  });

  it('does nothing when the download row is missing', async () => {
    prismaMock.download.findUnique.mockResolvedValue(null);

    await downloadService.process('dl-missing');

    expect(ytMock.downloadYouTubeAudio).not.toHaveBeenCalled();
  });

  it('bails when another invocation already claimed the row', async () => {
    prismaMock.download.findUnique.mockResolvedValue(mkDownload());
    prismaMock.download.updateMany.mockResolvedValue({ count: 0 }); // lost the claim race

    await downloadService.process('dl-1');

    expect(ytMock.downloadYouTubeAudio).not.toHaveBeenCalled();
    expect(driveMock.uploadFile).not.toHaveBeenCalled();
  });

  it('marks itself FAILED when a newer download exists for the same music', async () => {
    prismaMock.download.findUnique.mockResolvedValue(
      mkDownload({ id: 'dl-1', createdAt: minutesAgo(1) }),
    );
    prismaMock.download.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.download.findFirst.mockResolvedValue(mkDownload({ id: 'dl-2' })); // newer row wins

    await downloadService.process('dl-1');

    expect(prismaMock.download.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'dl-1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    expect(ytMock.downloadYouTubeAudio).not.toHaveBeenCalled();
    expect(driveMock.uploadFile).not.toHaveBeenCalled();
  });
});

describe('streamTarget', () => {
  it('returns the Drive file id for a READY download', async () => {
    prismaMock.download.findFirst.mockResolvedValue(
      mkDownload({ status: 'READY', storageKey: 'drive-1' }),
    );

    await expect(downloadService.streamTarget('user-1', 'music-1')).resolves.toEqual({
      fileId: 'drive-1',
    });
  });

  it('throws DOWNLOAD_NOT_AVAILABLE when nothing is ready', async () => {
    prismaMock.download.findFirst.mockResolvedValue(mkDownload({ status: 'PENDING' }));

    const err = await downloadService.streamTarget('user-1', 'music-1').catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('DOWNLOAD_NOT_AVAILABLE');
  });
});

describe('serializeMusic', () => {
  it('exposes streamUrl + downloadStatus for a READY download', () => {
    const music = { ...mkMusic(), downloads: [mkDownload({ status: 'READY' })] };
    const out = serializeMusic(music);
    expect(out.streamUrl).toBe('/api/music/music-1/stream');
    expect(out.downloadStatus).toBe('READY');
    expect('downloads' in out).toBe(false);
  });

  it('returns null fields with no downloads', () => {
    const out = serializeMusic({ ...mkMusic(), downloads: [] });
    expect(out.streamUrl).toBeNull();
    expect(out.downloadStatus).toBeNull();
  });
});

describe('musicService serialization', () => {
  it('list includes the latest download in the query', async () => {
    prismaMock.music.findMany.mockResolvedValue([{ ...mkMusic(), downloads: [] }]);

    await musicService.list('user-1');

    expect(prismaMock.music.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          downloads: expect.objectContaining({ take: 1 }),
        }),
      }),
    );
  });
});
