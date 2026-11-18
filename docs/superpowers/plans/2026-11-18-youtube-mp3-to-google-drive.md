# YouTube → MP3 → Google Drive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saved YouTube tracks are converted to MP3 inside Vercel
serverless functions, uploaded to a central Google Drive account, and
played through an app streaming route instead of the YouTube iframe.

**Architecture:** `yt-dlp` + `ffmpeg` run as child processes inside the
download function, kicked off asynchronously via Next.js `after()` so the
POST returns immediately. The `Download` table is the queue — dedupe and
crash-recovery are DB-level, no in-process state. Uploads go to a
`TuneBox` folder on one OAuth'd Google Drive account (refresh token in
env). `GET /api/music/[id]/stream` proxies Drive with Range support; the
existing `<audio>` path in `components/player.tsx` plays it.

**Tech Stack:** Next.js 15 on Vercel (node runtime), Prisma/MongoDB,
`googleapis`, `yt-dlp-exec`, `ffmpeg-static`, vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-youtube-mp3-to-google-drive-design.md`

## Global Constraints

- All new API routes MUST set `export const runtime = 'nodejs'`.
- The download route MUST set `export const maxDuration = 300` (Vercel
  clamps to the plan's cap; typical songs finish in <30s).
- `next.config.ts` MUST add `serverExternalPackages: ['yt-dlp-exec',
  'ffmpeg-static', 'googleapis']` and `outputFileTracingIncludes` entries
  for the `yt-dlp-exec` and `ffmpeg-static` binaries, or the function
  deploys without them.
- Error envelope follows `lib/api-response.ts`: `ok(data)` /
  `handleError(error)` with `AppError` + `ErrorCode`. Reuse existing codes
  `DOWNLOAD_NOT_AVAILABLE`, `DOWNLOAD_FAILED`, `STORAGE_ERROR`.
- Every mutating/streaming route calls `requireAuth()` and verifies
  `music.userId === user.id`.
- Never rely on `globalThis` for correctness — serverless instances are
  ephemeral and shared. Caches there are best-effort only.
- pnpm is the package manager. New deps with postinstall scripts MUST be
  added to `allowBuilds` in `pnpm-workspace.yaml`.
- Downloading YouTube audio violates YouTube ToS — do not surface the
  feature publicly; keep README wording accurate.

## Review Focus

Inputs most likely to bite that unit tests can't fully cover:

1. **YouTube bot-check on datacenter IPs** — `yt-dlp` on Vercel will fail
   with "Sign in to confirm you're not a bot" some of the time. Every
   failure must land as `FAILED` + readable `error`, UI offers Retry, and
   a `YOUTUBE_COOKIES` env (base64 cookies.txt) exists as the escape
   hatch. (Tested in Task 4 via mocked rejection; mitigation wired in
   Task 4.)
2. **Function killed mid-job** (timeout, eviction, deploy) — the PENDING/
   PROCESSING row is orphaned; the next `request`/`latest` touch marks
   stale rows FAILED (stale = `startedAt` older than `maxDuration`+buffer
   or `createdAt` older than it for PENDING). (Tested in Task 5.)
3. **Range requests for seeking** — `GET /stream` must forward `Range` to
   Drive and propagate `206`/`Content-Range`, or `<audio>` seeking
   breaks. (Manual verify in Task 6.)
4. **Missing Drive env vars** — every Drive-touching path throws
   `AppError(STORAGE_ERROR)` with a clear message, not a crash.
   (Tested in Task 3.)
5. **Duplicate enqueue** — double-clicking Download or re-saving the same
   track must not create two jobs or two Drive files; dedupe is enforced
   at the DB level, not in memory. (Tested in Task 5.)

---

### Task 1: Dependencies, test runner config, schema fields, env vars, next.config

**Files:**
- Modify: `package.json` (scripts + deps)
- Modify: `pnpm-workspace.yaml` (allowBuilds)
- Modify: `prisma/schema.prisma` (Download model, comments)
- Modify: `.env.example`, `.env`
- Modify: `next.config.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `Download.error?: string | null`, `Download.startedAt?:
  DateTime | null`; env names `GOOGLE_DRIVE_CLIENT_ID`,
  `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`,
  `GOOGLE_DRIVE_FOLDER_ID`, `DOWNLOAD_TMP_DIR`, `YOUTUBE_COOKIES`;
  `pnpm drive:auth` script; runnable `pnpm test`.

- [ ] **Step 1: Add deps**

```bash
pnpm add googleapis yt-dlp-exec ffmpeg-static
```

Add to `pnpm-workspace.yaml` `allowBuilds`: `yt-dlp-exec: true`,
`ffmpeg-static: true`, `googleapis: true`. Re-run `pnpm install` so
postinstall scripts fetch the binaries.

- [ ] **Step 2: Schema change**

In `prisma/schema.prisma`, add to `model Download`:

```prisma
error     String?
startedAt DateTime?
```

Change the section comment from "NOT for YouTube audio extraction" to
"Audio downloads — MP3 files stored on Google Drive (`storageKey` = Drive
file ID)". Then:

```bash
pnpm prisma:push && pnpm prisma:generate
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: { environment: 'node' },
});
```

- [ ] **Step 4: Update `next.config.ts`**

Add:

```ts
serverExternalPackages: ['yt-dlp-exec', 'ffmpeg-static', 'googleapis'],
outputFileTracingIncludes: {
  '/api/music/[id]/download': [
    './node_modules/yt-dlp-exec/bin/**',
    './node_modules/ffmpeg-static/**',
  ],
},
```

(Implementer: verify the actual binary paths inside the installed
packages and adjust the globs — the goal is both binaries ship in the
download function's bundle.)

- [ ] **Step 5: Env vars + script**

Append to `.env.example` (and matching empty keys in `.env`):

```
# Google Drive (central account — see scripts/drive-auth.mjs to get the token)
GOOGLE_DRIVE_CLIENT_ID=""
GOOGLE_DRIVE_CLIENT_SECRET=""
GOOGLE_DRIVE_REFRESH_TOKEN=""
# Optional — folder ID to reuse; auto-creates "TuneBox" folder if unset
GOOGLE_DRIVE_FOLDER_ID=""
# Optional — temp dir for downloads (defaults to os.tmpdir())
DOWNLOAD_TMP_DIR=""
# Optional — base64-encoded cookies.txt to bypass YouTube bot-checks on datacenter IPs
YOUTUBE_COOKIES=""
```

Add to `package.json` scripts: `"drive:auth": "node scripts/drive-auth.mjs"`.

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: clean; vitest runs (0 tests) without alias errors.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: add drive/download deps, vitest config, Download fields, vercel bundling config"
```

---

### Task 2: One-time Drive OAuth bootstrap script

**Files:**
- Create: `scripts/drive-auth.mjs`
- Modify: `README.md` (Google Drive setup section)

**Interfaces:**
- Produces: `pnpm drive:auth` — prints a consent URL, serves a localhost
  callback, prints a refresh token to paste into env vars. Requires
  `GOOGLE_DRIVE_CLIENT_ID`/`SECRET` set first.

- [ ] **Step 1: Write `scripts/drive-auth.mjs`**

Plain Node ESM script (no TS). Uses `googleapis`: build an `OAuth2`
client from env, print the consent URL with
`scope: ['https://www.googleapis.com/auth/drive.file']`,
`access_type: 'offline'`, `prompt: 'consent'`; start an `http` server on
`localhost:3333`, read `code` from `/oauth2callback`, exchange for
tokens, print `refresh_token`, exit. Load `.env` manually (read file into
`process.env` — dotenv isn't a dep).

- [ ] **Step 2: README section**

Document Google Cloud setup: enable **Google Drive API** in the same
project as the YouTube API key, create an **OAuth client (Desktop app)**,
copy ID/secret to env, run `pnpm drive:auth`, paste the printed token.

- [ ] **Step 3: Manual verify (human step)**

Run `pnpm drive:auth`, complete consent, confirm a refresh token prints.
Record it in `.env`. If deferred, everything still builds — Drive calls
just throw `STORAGE_ERROR` until configured.

- [ ] **Step 4: Commit**

```bash
git add scripts/drive-auth.mjs README.md && git commit -m "feat: add drive oauth bootstrap script"
```

---

### Task 3: Drive client + `driveService`

**Files:**
- Create: `lib/drive/client.ts`
- Create: `lib/services/drive-service.ts`
- Test: `lib/services/drive-service.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // lib/drive/client.ts
  export function getDriveClient(): drive_v3.Drive // OAuth2 + refresh token, globalThis best-effort cache

  // lib/services/drive-service.ts
  export const driveService = {
    ensureConfigured(): void; // throws AppError(STORAGE_ERROR) if env missing
    getFolderId(): Promise<string>; // env override or find-or-create "TuneBox", cached best-effort
    uploadFile(o: { filePath: string; name: string; mimeType: string }): Promise<{ fileId: string; fileSize: number }>;
    openReadStream(fileId: string, range?: string): Promise<{ stream: Readable; status: number; headers: Record<string, string> }>;
    deleteFile(fileId: string): Promise<void>; // best-effort, never throws
  };
  ```

- [ ] **Step 1: Write the failing test**

`lib/services/drive-service.test.ts` — `vi.mock('googleapis')` and
`vi.mock('@/lib/drive/client')` before import. Cases:
- `ensureConfigured` throws `AppError` code `STORAGE_ERROR` when
  `GOOGLE_DRIVE_REFRESH_TOKEN` is unset.
- `getFolderId` returns `GOOGLE_DRIVE_FOLDER_ID` env without API calls.
- `getFolderId` calls `files.list` (name='TuneBox', folder mimeType),
  creates via `files.create` when empty.
- `uploadFile` calls `files.create` with `media.body` fs stream +
  `parents: [folderId]`, returns `{fileId, fileSize}`.
- `openReadStream` calls `files.get({fileId, alt:'media'})` with
  `responseType: 'stream'`, forwards `range` into request headers.
- `deleteFile` swallows API rejections.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/services/drive-service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/drive/client.ts`**

`google.auth.OAuth2(clientId, clientSecret)` →
`setCredentials({refresh_token})` → `google.drive({version:'v3', auth})`.
Cache on `globalThis` as best-effort only (fine if cold instances
rebuild). Mirror `lib/db/index.ts`'s singleton pattern — read it first.

- [ ] **Step 4: Implement `lib/services/drive-service.ts`**

Per the interface. `ensureConfigured` checks the three `GOOGLE_DRIVE_*`
vars using `lib/utils/env.ts`. `openReadStream` maps the response to
`{stream, status, headers}`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run lib/services/drive-service.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/drive lib/services/drive-service* && git commit -m "feat: add google drive service"
```

---

### Task 4: Audio downloader (`yt-dlp` wrapper with bot-check mitigations)

**Files:**
- Create: `lib/download/yt-audio.ts`
- Test: `lib/download/yt-audio.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export async function downloadYouTubeAudio(
    videoId: string,
    outDir: string,
  ): Promise<{ filePath: string; fileSize: number }>; // mp3 on disk
  ```

- [ ] **Step 1: Write the failing test**

`vi.mock('yt-dlp-exec')`. Cases:
- calls the exec fn with `-x`, `--audio-format mp3`, output template
  containing `{outDir}/{videoId}`, `noPlaylist`, and `--ffmpeg-location`
  pointing at the `ffmpeg-static` path.
- when `YOUTUBE_COOKIES` is set, writes a decoded cookies file under
  `outDir` (or tmpdir) and passes `--cookies <path>`; when unset, no
  `--cookies` flag.
- exec rejection → throws `AppError(DOWNLOAD_FAILED)` with stderr text
  (truncated ≤300 chars) in `message`; cookies file cleaned up.
- success → returns `{filePath: <outDir>/<videoId>.mp3, fileSize}` from
  `fs.stat`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/download/yt-audio.test.ts` → FAIL.

- [ ] **Step 3: Implement `lib/download/yt-audio.ts`**

Thin wrapper over `yt-dlp-exec`. Flags: extract-audio mp3 best quality,
`--ffmpeg-location` = `ffmpeg-static` path, `--no-playlist`, output
`{outDir}/{videoId}.%(ext)s`. If `YOUTUBE_COOKIES` env set: base64-decode
to `{tmpdir}/yt-cookies-{pid}.txt`, pass `--cookies`. `finally`: unlink
the cookies temp file (the mp3 is the caller's to remove). Map thrown
errors to `AppError(DOWNLOAD_FAILED)` preserving stderr ≤300 chars.

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm vitest run lib/download && pnpm typecheck` → PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add lib/download && git commit -m "feat: add yt-dlp audio downloader with cookies mitigation"
```

---

### Task 5: `downloadService` — request, status, process, stale recovery

**Files:**
- Create: `lib/services/download-service.ts`
- Modify: `lib/services/music-service.ts` (`list`, `getById`, `delete`)
- Test: `lib/services/download-service.test.ts`

**Interfaces:**
- Consumes: `driveService` (Task 3), `downloadYouTubeAudio` (Task 4).
- Produces:
  ```ts
  export const downloadService = {
    request(userId: string, musicId: string): Promise<{ download: Download; isNew: boolean }>; // dedupe + stale sweep
    latest(userId: string, musicId: string): Promise<Download | null>; // also sweeps
    process(downloadId: string): Promise<void>;                      // job body (runs via after())
    streamTarget(userId: string, musicId: string): Promise<{ fileId: string }>;
  };
  // music-service additions on every serialized payload:
  //   downloadStatus: DownloadStatus | null
  //   streamUrl: string | null   // `/api/music/${id}/stream` when READY
  ```

Stale rule: a Download is stale when `PENDING` and `createdAt` older than
5 min, or `PROCESSING` and `startedAt` older than `maxDuration` + 60s
buffer (use 6 min). Stale rows are set `FAILED` with
`error: 'Interrupted'` during `request`/`latest` before status is
returned.

- [ ] **Step 1: Write the failing test**

`vi.mock` `@/lib/db` (prisma), `@/lib/services/drive-service`,
`@/lib/download/yt-audio`. Cases:
- `request` creates `Download{status:PENDING, sourceUrl:music.sourceUrl}`
  and returns `{download, isNew: true}` (the route triggers `process` —
  the service does not).
- `request` when latest is fresh PENDING/PROCESSING/READY → returns
  `{download: existing, isNew: false}`, no new insert.
- `request` when latest is FAILED or stale → marks stale FAILED (if
  applicable) then creates a fresh PENDING row, `isNew: true`.
- `request` on another user's music throws `NOT_FOUND`.
- `latest` marks stale rows FAILED before returning.
- `process` happy path: sets `{status:PROCESSING, startedAt}`, calls
  `downloadYouTubeAudio`, `uploadFile`, sets
  `{status:READY, storageKey:fileId, fileSize, mimeType:'audio/mpeg',
  completedAt}`, unlinks the temp mp3.
- `process` failure: downloader throws → `{status:FAILED, error:<msg>}`,
  temp cleanup still attempted.
- `process` on a row already FAILED/READY (lost race) → returns without
  touching Drive.
- `streamTarget` returns `{fileId: storageKey}` for READY; throws
  `DOWNLOAD_NOT_AVAILABLE` otherwise.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/services/download-service.test.ts` → FAIL.

- [ ] **Step 3: Implement `lib/services/download-service.ts`**

`process(downloadId)`: load row (guard: return early if not
PENDING/PROCESSING) → `driveService.ensureConfigured()` → set
PROCESSING+`startedAt` → `downloadYouTubeAudio(music.sourceId, tmpdir)` →
`uploadFile({name: \`${music.title} [${music.sourceId}].mp3\`, mimeType:'audio/mpeg'})`
→ set READY+`completedAt` → `finally` unlink temp mp3. Any throw →
FAILED + truncated `error`. Keep `process` fully self-contained so a
future standalone worker can call it unchanged.

- [ ] **Step 4: Extend `music-service.ts`**

- `list`/`getById`: `include: { downloads: { orderBy: { createdAt: 'desc' }, take: 1 } }`,
  serialize via `serializeMusic(music)` →
  `{...music, downloadStatus: downloads[0]?.status ?? null,
    streamUrl: downloads[0]?.status === 'READY' ? \`/api/music/${music.id}/stream\` : null,
    downloads: undefined}`.
- `delete`: before `prisma.music.delete`, best-effort
  `driveService.deleteFile(storageKey)` for each download row with a
  storageKey (try/catch — Drive may be unconfigured).

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm vitest run lib/services && pnpm typecheck` → PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add lib/services && git commit -m "feat: add download service with drive upload and stale recovery"
```

---

### Task 6: API routes — async download trigger, status, Range stream

**Files:**
- Create: `app/api/music/[id]/download/route.ts`
- Create: `app/api/music/[id]/stream/route.ts`

**Interfaces:**
- Consumes: `downloadService.request/latest/process/streamTarget`,
  `driveService.openReadStream`, `after` from `next/server`.
- Produces:
  - `POST /api/music/{id}/download` → `ok(download, 201|200)`; kicks off
    `process` in background via `after()` only when the returned row is
    a fresh PENDING (deduped rows aren't re-run).
  - `GET /api/music/{id}/download` → `ok(download | null)`
  - `GET /api/music/{id}/stream` → audio bytes; `206` + `Content-Range`
    when `Range` present; `Accept-Ranges: bytes`;
    `Content-Type: audio/mpeg`

- [ ] **Step 1: Write `app/api/music/[id]/download/route.ts`**

```ts
export const runtime = 'nodejs';
export const maxDuration = 300;
```

POST: `requireAuth` → `params` →
`const { download, isNew } = await downloadService.request(user.id, id)`.
When `isNew`, schedule the background job:

```ts
import { after } from 'next/server';
after(() => downloadService.process(download.id));
```

then `ok(download, {status: isNew ? 201 : 200})`. GET → `latest`.

- [ ] **Step 2: Write `app/api/music/[id]/stream/route.ts`**

`runtime = 'nodejs'`. GET → `requireAuth` → `streamTarget` →
`driveService.openReadStream(fileId, request.headers.get('range') ?? undefined)`
→

```ts
new Response(Readable.toWeb(res.stream) as ReadableStream, {
  status: res.status,
  headers: {
    'Content-Type': 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
    // pass through content-length / content-range from res.headers when present
  },
});
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: `ƒ /api/music/[id]/download` and `ƒ /api/music/[id]/stream` in
route table.

- [ ] **Step 4: Manual verify (needs Drive creds)**

`pnpm dev`, log in, save a track, POST
`/api/music/{id}/download`, poll GET until READY, then
`curl -H "Range: bytes=0-1023" .../stream` → expect `206` + 1024 bytes.

- [ ] **Step 5: Commit**

```bash
git add app/api/music && git commit -m "feat: add async download and range stream routes"
```

---

### Task 7: Player + UI — file playback, download actions, auto-download

**Files:**
- Modify: `lib/player.tsx` (`QueueItem.streamUrl`)
- Modify: `components/player.tsx` (audio-vs-iframe switch, seek)
- Modify: `components/track-row.tsx` (`TrackRowItem.streamUrl`,
  `downloadStatus`, download button, `mapToQueue`)
- Modify: `app/app/library/page.tsx` (pass fields through, wire
  download/polling) and any other page that maps music to queue items —
  check `app/app/playlists/[id]/page.tsx`, `app/app/page.tsx`
- Modify: `app/app/add/page.tsx` (auto-download after save)

**Interfaces:**
- Consumes: `streamUrl`/`downloadStatus` from Task 5 serialization;
  `POST /api/music/{id}/download`, `GET /api/music/{id}/download` (Task 6).
- Produces: `QueueItem { ..., streamUrl: string | null }`;
  `TrackRowItem { ..., streamUrl: string | null, downloadStatus: DownloadStatus | null }`.

- [ ] **Step 1: Player switch in `components/player.tsx`**

`const filePlayback = current.sourceType === 'AUTHORIZED_AUDIO' || !!current.streamUrl`.
- YT effect guard: add `|| current.streamUrl` to the early return.
- Iframe div: render only when `current.sourceType === 'YOUTUBE' && !current.streamUrl`.
- `<audio>` block: render when `filePlayback`;
  `src={current.streamUrl ?? current.sourceUrl}`.
- `handleSeek`: `if (filePlayback) audioRef... else ytPlayer?.seekTo(...)`.
- YT progress-poll effect: skip when `filePlayback`.

- [ ] **Step 2: Types + mapping**

Add `streamUrl: string | null` to `QueueItem`; add `streamUrl` +
`downloadStatus` to `TrackRowItem`; `mapToQueue` copies
`streamUrl: item.streamUrl ?? null`. Update the playlist page's prisma
`select` to include `downloads: { where: { status: 'READY' }, take: 1,
select: { id: true } }` and map `streamUrl`/`downloadStatus` the same
way — extract a shared helper if it avoids duplication.

- [ ] **Step 3: Download button on `TrackRow`**

New optional props `downloadStatus`, `onDownload(id)`. Icon button
before the favorite button, lucide icons: `Download` (none),
`Loader2` spin (PENDING/PROCESSING), `CloudCheck`/`Check` (READY,
non-interactive), `RotateCcw` (FAILED → retry, show `error` in title
tooltip). Always visible (not hover-gated) when status exists. Library
page owns the handler: POST → optimistic PENDING → poll
`GET .../download` every 3s until READY/FAILED → refresh row.

- [ ] **Step 4: Auto-download in `app/app/add/page.tsx`**

After `handleSave` succeeds, fire-and-forget
`fetch(\`/api/music/${data.data.id}/download\`, {method:'POST'})` before
redirect — don't block navigation.

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm build` → clean.
Manual: add a track → badge PENDING→READY → play → audio streams, no
iframe box; seek works.

- [ ] **Step 6: Commit**

```bash
git add lib/player.tsx components app && git commit -m "feat: play downloaded mp3 via stream route, add download UI"
```

---

### Task 8: Docs + Vercel deploy checklist + end-to-end pass

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README**

Document the pipeline (save → convert → Drive → stream), env vars,
`pnpm drive:auth`, the Vercel deploy notes below, and the ToS caveat in
one line.

- [ ] **Step 2: Vercel deploy checklist (document + walk through)**

- Vercel project env vars: all `GOOGLE_DRIVE_*`, `DATABASE_URL`,
  `AUTH_SECRET`, `YOUTUBE_API_KEY`, optional `YOUTUBE_COOKIES`.
- MongoDB Atlas → Network Access → allow `0.0.0.0/0` (Vercel has dynamic
  IPs; note this means any IP can reach the DB — credentials still
  required).
- Redeploy; hit `/api/health`; save a track on the deployed URL; watch
  Download status reach READY; play + seek.
- If YouTube bot-checks appear in `error`, do the cookies workaround:
  browser extension → export `cookies.txt` for youtube.com → base64 it →
  `YOUTUBE_COOKIES` env → redeploy.

- [ ] **Step 3: Full verify**

`pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all clean.

- [ ] **Step 4: Commit + report**

```bash
git add -A && git commit -m "docs: document youtube mp3 to drive pipeline and vercel deploy"
```

Report to the human: files created, env vars to fill, the `pnpm
drive:auth` step, the bot-check/cookies escape hatch, and the ToS caveat.
