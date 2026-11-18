# YouTube → MP3 → Google Drive — Design

## Intent

Replace YouTube iframe playback with self-hosted audio: user pastes a
YouTube link, the server downloads the audio as MP3 via `yt-dlp` +
`ffmpeg`, uploads it to Google Drive, and the player streams the stored
file through an app API route.

**Deployment target: Vercel (serverless).**

## Goals / non-goals / anti-goals

- Goal: every saved YouTube track becomes a playable MP3 stored on Drive.
- Goal: playback works without the YouTube iframe once a file is ready.
- Non-goal: per-user Google Drive accounts (out of scope — see decisions).
- Non-goal: video downloads, playlists/whole-channel imports.
- Anti-goal: silent failures — every download state is visible and retryable.
- Anti-goal: breaking the app when Drive isn't configured — fall back to iframe.

## Constraints

- Downloading YouTube audio violates YouTube ToS. Accepted risk for a
  personal project; `yt-dlp` breaks periodically when YouTube changes
  things and must be upgradeable.
- **Vercel is serverless**: functions are short-lived (Hobby ~60s,
  configurable `maxDuration` up to plan limit), isolated per request, and
  cannot host background processes. `globalThis` state is best-effort only.
- **YouTube aggressively bot-checks datacenter IPs.** `yt-dlp` on Vercel
  will fail more often than on a residential connection. Mitigations:
  clean FAILED states + retry, `YOUTUBE_COOKIES` env escape hatch,
  yt-dlp extractor-arg env passthrough. Known-accepted risk.
- `yt-dlp` + `ffmpeg` binaries must ship inside the serverless bundle
  (`outputFileTracingIncludes` in `next.config.ts`).
- Google Drive has no stable public `<audio>` streaming URLs; playback is
  proxied through an app route with Range support for seeking. This works
  fine on Vercel.
- MinIO/local storage is unreachable from Vercel — storage must be cloud.

## Approaches considered

1. **Chosen — Vercel functions + `after()` + Drive.** The POST /download
   route creates a PENDING row, returns immediately, and runs the job via
   Next.js `after()` (extends function lifetime post-response). The
   `Download` table is the queue: dedupe and crash-recovery are DB-level.
2. Separate worker (Mac/Pi/free VPS) polling Mongo — more reliable
   downloads (residential IP), but adds an always-on machine. **Rejected
   for now** by owner; the design keeps the job body isolated in
   `downloadService.process` so moving to a worker later is a new entry
   point, not a rewrite.
3. Redis/BullMQ + worker service — real infra, wrong scale. Rejected.

## Decisions (mine unless marked otherwise — correct me if wrong)

- **Whose Drive:** one central account (the app owner's). OAuth refresh
  token in env. *(Owner-confirmed: Drive over R2/B2.)*
- **Worker location:** inside Vercel functions. *(Owner-chosen, with the
  datacenter bot-check risk explicitly accepted.)*
- **Storage location of file id:** `Download.storageKey` = Drive file ID;
  `Download.mimeType` = `audio/mpeg`. New fields: `Download.error` (failure
  detail), `Download.startedAt` (stale-job detection). The schema comment
  "NOT for YouTube audio extraction" is updated — that policy changes.
- **Playback URL:** `/api/music/{id}/stream` returned as `streamUrl` on
  music payloads when a READY download exists; `<audio>` plays it; iframe
  remains fallback for tracks without a READY download.
- **When downloads trigger:** automatically after saving a YouTube track
  from /app/add, plus manual Download/Retry in the library.
- **Orphaned jobs:** rows stuck PENDING/PROCESSING older than the function
  timeout are marked FAILED when touched — serverless has no startup hook
  to sweep them, so recovery runs lazily inside `request`/`latest`.

## Left to the builder

- Exact yt-dlp flags (spec pins `-x --audio-format mp3`), Drive filename
  (`{title} [{videoId}].mp3` suggested), UI polling interval.
