import { createReadStream } from 'node:fs';
import type { Readable } from 'node:stream';

import { getDriveClient } from '@/lib/drive/client';
import { AppError } from '@/lib/errors/AppError';
import { ErrorCode } from '@/lib/errors/codes';
import { optionalEnv } from '@/lib/utils/env';

const FOLDER_NAME = 'TuneBox';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

declare global {
  // eslint-disable-next-line no-var
  var __tuneboxDriveFolderId: string | undefined;
}

export const driveService = {
  ensureConfigured(): void {
    const missing = [
      'GOOGLE_DRIVE_CLIENT_ID',
      'GOOGLE_DRIVE_CLIENT_SECRET',
      'GOOGLE_DRIVE_REFRESH_TOKEN',
    ].filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new AppError({
        code: ErrorCode.STORAGE_ERROR,
        message: `Google Drive is not configured (missing: ${missing.join(', ')}).`,
      });
    }
  },

  async getFolderId(): Promise<string> {
    const envFolder = optionalEnv('GOOGLE_DRIVE_FOLDER_ID', '');
    if (envFolder) return envFolder;
    if (globalThis.__tuneboxDriveFolderId) return globalThis.__tuneboxDriveFolderId;

    const drive = getDriveClient();
    const q = `name = '${FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and trashed = false`;
    const list = await drive.files.list({ q, fields: 'files(id)' });
    const existing = list.data.files?.[0]?.id;
    if (existing) {
      globalThis.__tuneboxDriveFolderId = existing;
      return existing;
    }

    const created = await drive.files.create({
      requestBody: { name: FOLDER_NAME, mimeType: FOLDER_MIME },
      fields: 'id',
    });
    const id = created.data.id;
    if (!id) {
      throw new AppError({ code: ErrorCode.STORAGE_ERROR, message: 'Failed to create Drive folder.' });
    }
    globalThis.__tuneboxDriveFolderId = id;
    return id;
  },

  async uploadFile(opts: {
    filePath: string;
    name: string;
    mimeType: string;
  }): Promise<{ fileId: string; fileSize: number }> {
    this.ensureConfigured();
    const folderId = await this.getFolderId();
    const res = await getDriveClient().files.create({
      requestBody: { name: opts.name, parents: [folderId] },
      media: { mimeType: opts.mimeType, body: createReadStream(opts.filePath) },
      fields: 'id,size',
    });
    const fileId = res.data.id;
    if (!fileId) {
      throw new AppError({ code: ErrorCode.STORAGE_ERROR, message: 'Drive upload returned no file ID.' });
    }
    return { fileId, fileSize: Number(res.data.size ?? 0) };
  },

  async openReadStream(
    fileId: string,
    range?: string,
  ): Promise<{ stream: Readable; status: number; headers: Record<string, string> }> {
    this.ensureConfigured();
    const res = await getDriveClient().files.get(
      { fileId, alt: 'media' },
      {
        responseType: 'stream',
        headers: range ? { Range: range } : {},
      },
    );
    // gaxios v6 returns fetch-style Headers; older versions return a
    // plain record — normalize so callers can index by lowercase name.
    const raw = res.headers as unknown;
    const headers =
      raw && typeof (raw as Headers).entries === 'function'
        ? Object.fromEntries((raw as Headers).entries())
        : ((raw ?? {}) as Record<string, string>);
    return {
      stream: res.data as unknown as Readable,
      status: res.status ?? 200,
      headers,
    };
  },

  async deleteFile(fileId: string): Promise<void> {
    try {
      await getDriveClient().files.delete({ fileId });
    } catch {
      // Best-effort cleanup — Drive may be unreachable; swallow.
    }
  },
};
