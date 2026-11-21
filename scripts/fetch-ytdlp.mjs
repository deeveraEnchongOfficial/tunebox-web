// Fetch the standalone yt-dlp binary for the current platform into bin/.
// Runs on postinstall; skips when a binary already exists.
// Asset names: yt-dlp_linux (x64 standalone), yt-dlp_macos (universal2).
import { chmod, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BIN_DIR = path.resolve('bin');
const BIN_PATH = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

const ASSETS = {
  darwin: 'yt-dlp_macos',
  linux: 'yt-dlp_linux',
  win32: 'yt-dlp.exe',
};

async function main() {
  if (existsSync(BIN_PATH)) {
    console.log('[fetch-ytdlp] binary already present, skipping');
    return;
  }
  const asset = ASSETS[process.platform];
  if (!asset) {
    console.warn(`[fetch-ytdlp] unsupported platform ${process.platform}, skipping`);
    return;
  }
  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
  console.log(`[fetch-ytdlp] downloading ${url}`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  await mkdir(BIN_DIR, { recursive: true });
  await writeFile(BIN_PATH, Buffer.from(await res.arrayBuffer()), { mode: 0o755 });
  await chmod(BIN_PATH, 0o755);
  console.log(`[fetch-ytdlp] installed ${BIN_PATH}`);
}

main().catch((err) => {
  console.warn('[fetch-ytdlp] failed:', err.message);
});
