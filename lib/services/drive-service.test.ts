import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const files = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/drive/client', () => ({
  getDriveClient: () => ({ files }),
}));

import { driveService } from '@/lib/services/drive-service';
import { AppError } from '@/lib/errors/AppError';

const ENV_KEYS = [
  'GOOGLE_DRIVE_CLIENT_ID',
  'GOOGLE_DRIVE_CLIENT_SECRET',
  'GOOGLE_DRIVE_REFRESH_TOKEN',
  'GOOGLE_DRIVE_FOLDER_ID',
] as const;

let savedEnv: Record<string, string | undefined> = {};
let tmpDir: string;

function resetFolderCache() {
  delete (globalThis as Record<string, unknown>).__tuneboxDriveFolderId;
}

beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  resetFolderCache();
  vi.clearAllMocks();
  tmpDir = mkdtempSync(path.join(tmpdir(), 'drive-test-'));
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  resetFolderCache();
  rmSync(tmpDir, { recursive: true, force: true });
});

function configureDriveEnv() {
  process.env.GOOGLE_DRIVE_CLIENT_ID = 'id';
  process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'secret';
  process.env.GOOGLE_DRIVE_REFRESH_TOKEN = 'token';
}

describe('ensureConfigured', () => {
  it('throws STORAGE_ERROR when refresh token is missing', () => {
    delete process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    expect(() => driveService.ensureConfigured()).toThrowError(AppError);
    try {
      driveService.ensureConfigured();
    } catch (e) {
      expect((e as AppError).code).toBe('STORAGE_ERROR');
    }
  });

  it('passes when all credentials are set', () => {
    configureDriveEnv();
    expect(() => driveService.ensureConfigured()).not.toThrow();
  });
});

describe('getFolderId', () => {
  it('returns GOOGLE_DRIVE_FOLDER_ID env without calling the API', async () => {
    configureDriveEnv();
    process.env.GOOGLE_DRIVE_FOLDER_ID = 'folder-from-env';
    expect(await driveService.getFolderId()).toBe('folder-from-env');
    expect(files.list).not.toHaveBeenCalled();
  });

  it('finds an existing TuneBox folder', async () => {
    configureDriveEnv();
    files.list.mockResolvedValue({ data: { files: [{ id: 'existing-folder' }] } });
    expect(await driveService.getFolderId()).toBe('existing-folder');
    expect(files.create).not.toHaveBeenCalled();
  });

  it('creates the TuneBox folder when none exists', async () => {
    configureDriveEnv();
    files.list.mockResolvedValue({ data: { files: [] } });
    files.create.mockResolvedValue({ data: { id: 'new-folder' } });
    expect(await driveService.getFolderId()).toBe('new-folder');
    expect(files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          name: 'TuneBox',
          mimeType: 'application/vnd.google-apps.folder',
        }),
      }),
    );
  });
});

describe('uploadFile', () => {
  it('uploads to the folder and returns fileId + fileSize', async () => {
    configureDriveEnv();
    process.env.GOOGLE_DRIVE_FOLDER_ID = 'folder-1';
    files.create.mockResolvedValue({ data: { id: 'file-1', size: '4096' } });

    const filePath = path.join(tmpDir, 'song.mp3');
    writeFileSync(filePath, 'fake-mp3-bytes');

    const result = await driveService.uploadFile({
      filePath,
      name: 'song.mp3',
      mimeType: 'audio/mpeg',
    });

    expect(result).toEqual({ fileId: 'file-1', fileSize: 4096 });
    const call = files.create.mock.calls[0]![0] as {
      requestBody: { name: string; parents: string[] };
      media: { mimeType: string; body: unknown };
      fields: string;
    };
    expect(call.requestBody.name).toBe('song.mp3');
    expect(call.requestBody.parents).toEqual(['folder-1']);
    expect(call.media.mimeType).toBe('audio/mpeg');
    expect(call.media.body).toBeInstanceOf(Readable);
    // Drain the lazy read stream so its fs.open completes before tmp cleanup.
    for await (const _chunk of call.media.body as Readable) { /* consume */ }
  });
});

describe('openReadStream', () => {
  it('requests media as a stream and forwards the range header', async () => {
    configureDriveEnv();
    const stream = Readable.from(['data']);
    files.get.mockResolvedValue({ data: stream, status: 206, headers: { 'content-range': 'bytes 0-3/8' } });

    const res = await driveService.openReadStream('file-1', 'bytes=0-3');

    expect(files.get).toHaveBeenCalledWith(
      { fileId: 'file-1', alt: 'media' },
      expect.objectContaining({
        responseType: 'stream',
        headers: expect.objectContaining({ Range: 'bytes=0-3' }),
      }),
    );
    expect(res.stream).toBe(stream);
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 0-3/8');
  });

  it('omits the range header when not provided', async () => {
    configureDriveEnv();
    files.get.mockResolvedValue({ data: Readable.from(['x']), status: 200, headers: {} });
    await driveService.openReadStream('file-1');
    const opts = files.get.mock.calls[0]![1] as { headers?: Record<string, string> };
    expect(opts.headers?.Range).toBeUndefined();
  });
});

describe('deleteFile', () => {
  it('deletes via the Drive API', async () => {
    configureDriveEnv();
    files.delete.mockResolvedValue({});
    await expect(driveService.deleteFile('file-1')).resolves.toBeUndefined();
    expect(files.delete).toHaveBeenCalledWith({ fileId: 'file-1' });
  });

  it('swallows API failures (best-effort cleanup)', async () => {
    configureDriveEnv();
    files.delete.mockRejectedValue(new Error('drive down'));
    await expect(driveService.deleteFile('file-1')).resolves.toBeUndefined();
  });
});
