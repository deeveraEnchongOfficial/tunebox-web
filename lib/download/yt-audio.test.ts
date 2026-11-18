import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({ execFile: execFileMock }));

import { downloadYouTubeAudio } from '@/lib/download/yt-audio';
import { AppError } from '@/lib/errors/AppError';

let tmpDir: string;
let savedCookies: string | undefined;

function okCall() {
  execFileMock.mockImplementation(
    (_cmd: string, _args: string[], _opts: unknown, cb: (e: Error | null, so: string, se: string) => void) =>
      cb(null, 'done', ''),
  );
}

function failCall(stderr: string) {
  execFileMock.mockImplementation(
    (_cmd: string, _args: string[], _opts: unknown, cb: (e: Error | null, so: string, se: string) => void) => {
      const err = new Error('exit 1');
      (err as { stderr?: string }).stderr = stderr;
      cb(err, '', stderr);
    },
  );
}

function argsOf(call = 0): string[] {
  return execFileMock.mock.calls[call]![1] as string[];
}

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'ytaudio-test-'));
  savedCookies = process.env.YOUTUBE_COOKIES;
  delete process.env.YOUTUBE_COOKIES;
  vi.clearAllMocks();
});

afterEach(() => {
  if (savedCookies === undefined) delete process.env.YOUTUBE_COOKIES;
  else process.env.YOUTUBE_COOKIES = savedCookies;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('downloadYouTubeAudio', () => {
  it('invokes yt-dlp with mp3 extraction flags and the output template', async () => {
    okCall();
    writeFileSync(path.join(tmpDir, 'abc123.mp3'), 'fake');

    await downloadYouTubeAudio('abc123', tmpDir);

    const [cmd, args] = [execFileMock.mock.calls[0]![0], argsOf()];
    expect(String(cmd)).toContain('yt-dlp');
    expect(args).toContain('-x');
    expect(args).toContain('--audio-format');
    expect(args).toContain('mp3');
    expect(args).toContain('--no-playlist');
    expect(args.join(' ')).toContain('abc123');
    expect(args).toContain('--ffmpeg-location');
    expect(args).not.toContain('--cookies');
  });

  it('returns the mp3 path and size', async () => {
    okCall();
    const mp3 = path.join(tmpDir, 'vid9.mp3');
    writeFileSync(mp3, Buffer.alloc(1234));

    const res = await downloadYouTubeAudio('vid9', tmpDir);
    expect(res).toEqual({ filePath: mp3, fileSize: 1234 });
  });

  it('passes --cookies when YOUTUBE_COOKIES is set and cleans the file up', async () => {
    okCall();
    process.env.YOUTUBE_COOKIES = Buffer.from('cookie-data').toString('base64');
    writeFileSync(path.join(tmpDir, 'v.mp3'), 'x');

    await downloadYouTubeAudio('v', tmpDir);

    const args = argsOf();
    const idx = args.indexOf('--cookies');
    expect(idx).toBeGreaterThanOrEqual(0);
    const cookiesPath = args[idx + 1]!;
    expect(existsSync(cookiesPath)).toBe(false); // cleaned up after the call
  });

  it('maps failures to AppError DOWNLOAD_FAILED with truncated stderr', async () => {
    failCall('ERROR: Sign in to confirm you are not a bot');

    const err = await downloadYouTubeAudio('v', tmpDir).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('DOWNLOAD_FAILED');
    expect(err.message).toContain('not a bot');
  });

  it('truncates very long stderr to 300 chars', async () => {
    failCall('x'.repeat(1000));

    const err = await downloadYouTubeAudio('v', tmpDir).catch((e) => e);
    expect(err.code).toBe('DOWNLOAD_FAILED');
    expect(err.message.length).toBeLessThanOrEqual(300);
  });
});
