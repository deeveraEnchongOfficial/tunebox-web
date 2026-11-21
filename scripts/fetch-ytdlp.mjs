// Fetch the standalone yt-dlp binary for the current platform into bin/,
// and stage the ffmpeg-static binary alongside it. Runs on postinstall.
// Asset names: yt-dlp_linux (x64 standalone), yt-dlp_macos (universal2).
// Both live in bin/ as REAL files — Vercel's function packer rejects
// traced files inside symlinked dirs (pnpm's node_modules is all symlinks).
import { chmod, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const BIN_DIR = path.resolve('bin');
const BIN_PATH = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

const ASSETS = {
  darwin: 'yt-dlp_macos',
  linux: 'yt-dlp_linux',
  win32: 'yt-dlp.exe',
};

async function main() {
  await mkdir(BIN_DIR, { recursive: true });

  if (existsSync(BIN_PATH)) {
    console.log('[fetch-ytdlp] binary already present, skipping');
  } else {
    const asset = ASSETS[process.platform];
    if (!asset) {
      console.warn(`[fetch-ytdlp] unsupported platform ${process.platform}, skipping`);
    } else {
      const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
      console.log(`[fetch-ytdlp] downloading ${url}`);
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`download failed: ${res.status}`);
      await writeFile(BIN_PATH, Buffer.from(await res.arrayBuffer()), { mode: 0o755 });
      await chmod(BIN_PATH, 0o755);
      console.log(`[fetch-ytdlp] installed ${BIN_PATH}`);
    }
  }

  // Stage ffmpeg from the just-installed ffmpeg-static package.
  const ffmpegDest = path.join(
    BIN_DIR,
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
  );
  if (!existsSync(ffmpegDest)) {
    try {
      const src = require('ffmpeg-static');
      await copyFile(src, ffmpegDest);
      await chmod(ffmpegDest, 0o755);
      console.log(`[fetch-ytdlp] staged ffmpeg at ${ffmpegDest}`);
    } catch (err) {
      console.warn('[fetch-ytdlp] could not stage ffmpeg:', err.message);
    }
  }
}

main().catch((err) => {
  console.warn('[fetch-ytdlp] failed:', err.message);
});
