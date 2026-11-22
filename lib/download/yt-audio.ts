import { execFile } from 'node:child_process';
import { stat, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { AppError } from '@/lib/errors/AppError';
import { ErrorCode } from '@/lib/errors/codes';

// Both binaries are staged into bin/ by scripts/fetch-ytdlp.mjs at
// postinstall — real files so Vercel can trace/package them.
const YT_DLP_BIN = path.join(
  process.cwd(),
  'bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp',
);
const FFMPEG_BIN = path.join(
  process.cwd(),
  'bin',
  process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
);
const STDERR_LIMIT = 300;

interface ExecResult {
  stdout: string;
  stderr: string;
}

function run(
  cmd: string,
  args: string[],
  onStderr?: (chunk: string) => void,
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      cmd,
      args,
      { maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(Object.assign(err, { stderr: String(stderr ?? '') }));
        } else {
          resolve({ stdout: String(stdout), stderr: String(stderr ?? '') });
        }
      },
    );
    if (onStderr) child.stderr?.on('data', (chunk) => onStderr(String(chunk)));
  });
}

// yt-dlp writes "[download]  42.6% of …" to stderr (carriage-return updates).
const PERCENT_RE = /\[download\]\s+(\d+(?:\.\d+)?)%/;

export async function downloadYouTubeAudio(
  videoId: string,
  outDir: string,
  onProgress?: (percent: number) => void,
): Promise<{ filePath: string; fileSize: number }> {
  const outPath = path.join(outDir, `${videoId}.mp3`);
  let cookiesPath: string | null = null;

  const args = [
    '-x',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '0',
    '--no-playlist',
    '--ffmpeg-location',
    FFMPEG_BIN,
    '-o',
    path.join(outDir, `${videoId}.%(ext)s`),
  ];

  const cookiesB64 = process.env.YOUTUBE_COOKIES;
  if (cookiesB64) {
    cookiesPath = path.join(tmpdir(), `yt-cookies-${process.pid}-${Date.now()}.txt`);
    await writeFile(cookiesPath, Buffer.from(cookiesB64, 'base64'));
    args.push('--cookies', cookiesPath);
  }

  args.push(`https://www.youtube.com/watch?v=${videoId}`);

  try {
    await run(YT_DLP_BIN, args, (chunk) => {
      const m = PERCENT_RE.exec(chunk);
      if (m?.[1]) onProgress?.(Math.min(100, Math.round(parseFloat(m[1]))));
    });
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr;
    const detail = stderr || (err as Error).message || 'yt-dlp failed';
    throw new AppError({
      code: ErrorCode.DOWNLOAD_FAILED,
      message: `YouTube download failed: ${detail}`.slice(0, STDERR_LIMIT),
    });
  } finally {
    if (cookiesPath) await unlink(cookiesPath).catch(() => {});
  }

  const { size } = await stat(outPath);
  return { filePath: outPath, fileSize: size };
}
