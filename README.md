# TuneBox Web

> Full-stack web app + backend API for TuneBox — a personal music library.
> **Independent project.** The Flutter mobile app (`../mobile`) is a separate repo and communicates with this API over HTTPS.
>
> **Live:** https://tunebox-web-chi.vercel.app

## Features

- **Authentication** — register, login, logout (Better Auth with email/password)
- **Music library** — paste a YouTube URL, fetch metadata via YouTube Data API, save to your library
- **MP3 downloads** — YouTube audio is converted to MP3 (`yt-dlp` + `ffmpeg`) and stored in a central Google Drive account; playback streams the file through the app
- **Playback** — downloaded tracks play as plain audio; the YouTube iframe remains as a fallback for tracks without a download yet (play/pause, seek, volume, shuffle, repeat, auto-advance)
- **Favorites** — toggle favorite on any track
- **Playlists** — create, edit, delete playlists; add/remove tracks; reorder
- **Responsive UI** — works on desktop (sidebar) and mobile (slide-in drawer + top bar)
- **shadcn/ui** — dark theme matching the mobile app (`#1DB954` accent)

## Stack

- **Next.js 15** (App Router, Route Handlers, Server Components)
- **TypeScript** (strict mode)
- **Prisma + MongoDB** (Atlas)
- **Better Auth** (Prisma adapter, email/password, session cookies)
- **Tailwind CSS v4** + **shadcn/ui** components
- **Zod** validation
- **YouTube IFrame API** for in-browser playback
- **YouTube Data API v3** for metadata (title, channel, thumbnail, duration)

## Legal / compliance

- Downloading YouTube audio violates YouTube's Terms of Service. This feature exists for personal, self-hosted use only — do not expose it publicly or redistribute downloaded files.
- Playback falls back to the official YouTube IFrame embed when a track has no downloaded file.
- MP3s are stored in a single Google Drive account you own (OAuth `drive.file` scope), not distributed.

## Prerequisites

- Node.js >= 22, pnpm v11+
- MongoDB Atlas connection string
- YouTube Data API key (optional but recommended — get one from [Google Cloud Console](https://console.cloud.google.com/))

### Google Drive setup (audio downloads)

MP3 downloads are uploaded to a central Google Drive account. One-time setup:

1. In [Google Cloud Console](https://console.cloud.google.com/), same project as your YouTube API key: **APIs & Services → Library → enable "Google Drive API"**.
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID → Desktop app**. Copy the client ID and secret into `.env`.
3. Run `pnpm drive:auth`, open the printed URL, approve access, and paste the printed refresh token into `.env` (`GOOGLE_DRIVE_REFRESH_TOKEN`).
4. Optional: set `GOOGLE_DRIVE_FOLDER_ID` to reuse a folder; otherwise a `TuneBox` folder is created automatically on first upload.

## Quick start

```bash
pnpm install
cp .env.example .env    # edit .env with your values
pnpm prisma:generate
pnpm prisma:db push     # sync schema to MongoDB
pnpm dev
```

App at `http://localhost:3000` (dev) or `https://tunebox-web-chi.vercel.app` (production). Health check: `GET /api/health`.

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | MongoDB Atlas connection string |
| `BETTER_AUTH_SECRET` | Auth secret (generate with `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | App URL (`http://localhost:3000` for dev, `https://tunebox-web-chi.vercel.app` for prod) |
| `NEXT_PUBLIC_APP_URL` | Public app URL (same as `BETTER_AUTH_URL`) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key (optional — enables real metadata) |
| `GOOGLE_DRIVE_CLIENT_ID` | OAuth client ID for the central Drive account |
| `GOOGLE_DRIVE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Refresh token from `pnpm drive:auth` |
| `GOOGLE_DRIVE_FOLDER_ID` | Optional — Drive folder to reuse; auto-creates `TuneBox` if unset |
| `DOWNLOAD_TMP_DIR` | Optional — temp dir for in-flight MP3s (defaults to OS tmp) |
| `YOUTUBE_COOKIES` | Optional — base64 `cookies.txt` to bypass YouTube bot-checks on datacenter IPs |

## Scripts

| Script | Description |
| --- | --- |
| `dev` | Start dev server on port 3000 |
| `build` | Production build |
| `start` | Start production server |
| `lint` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest |
| `prisma:generate` | Generate Prisma client |
| `prisma:db push` | Sync schema to MongoDB |
| `prisma:studio` | Prisma Studio UI |
| `drive:auth` | One-time Google Drive OAuth flow → prints refresh token |

## Deploy to Vercel

1. Set env vars in the Vercel dashboard: `DATABASE_URL`, `AUTH_SECRET`, `YOUTUBE_API_KEY`, all `GOOGLE_DRIVE_*` vars, optional `YOUTUBE_COOKIES`.
2. MongoDB Atlas → **Network Access → allow `0.0.0.0/0`** — Vercel functions use dynamic IPs. (The DB still requires credentials; this only opens network access.)
3. Deploy. Verify `GET /api/health` → `{"status":"ok"}`.

### Audio pipeline notes

- Saving a YouTube track auto-triggers `POST /api/music/[id]/download`; the job runs inside the function via `after()` (`maxDuration = 300s`). `yt-dlp` + `ffmpeg` binaries ship inside the bundle via `outputFileTracingIncludes`.
- Downloads run on datacenter IPs — YouTube **will** bot-check some of them. Failed jobs surface as `FAILED` + retry button in the library. Workaround: export `cookies.txt` for youtube.com from your browser, base64 it, set `YOUTUBE_COOKIES`, redeploy.
- Playback goes through `GET /api/music/[id]/stream`, which proxies Drive with `Range` support so seeking works. Stream bandwidth counts against Vercel's transfer quota (~100 GB/mo Hobby).

## API routes

All routes (except `/api/auth/*` and `/api/health`) require authentication.

| Route | Methods | Description |
| --- | --- | --- |
| `/api/auth/[...all]` | GET, POST | Better Auth handler (register, login, logout, session) |
| `/api/health` | GET | Health check |
| `/api/music` | GET, POST | List music / Create music entry |
| `/api/music/resolve` | POST | Resolve YouTube URL to metadata |
| `/api/music/[id]` | GET, PATCH, DELETE | Get / update / delete a track |
| `/api/music/[id]/download` | POST, GET | Start MP3 download → Drive upload / poll status |
| `/api/music/[id]/stream` | GET | Stream the downloaded MP3 (Range-aware, auth-gated) |
| `/api/music/[id]/favorite` | POST, DELETE | Toggle / remove favorite |
| `/api/favorites` | GET | List all favorites |
| `/api/playlists` | GET, POST | List / create playlists |
| `/api/playlists/[id]` | GET, PATCH, DELETE | Get / update / delete a playlist |
| `/api/playlists/[id]/items` | POST | Add track to playlist |
| `/api/playlists/[id]/items/[musicId]` | DELETE | Remove track from playlist |

### Response envelope

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

## Project structure

```
tunebox-web/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── auth/[...all]/      # Better Auth
│   │   ├── health/             # Health check
│   │   ├── music/              # Music CRUD + resolve + favorite
│   │   ├── favorites/          # Favorites list
│   │   └── playlists/          # Playlists CRUD + items
│   ├── app/                    # Protected app pages (auth required)
│   │   ├── layout.tsx          # App shell with sidebar + player
│   │   ├── page.tsx            # Dashboard (stats + recent)
│   │   ├── add/                # Add music (paste URL)
│   │   ├── library/            # Library (songs + favorites)
│   │   └── playlists/          # Playlists grid + detail
│   ├── login/                  # Login page
│   ├── register/               # Register page
│   ├── layout.tsx              # Root layout (PlayerProvider)
│   └── globals.css             # Tailwind v4 + theme tokens
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── player.tsx              # Global player bar (YouTube IFrame API)
│   ├── player-error-boundary.tsx
│   └── play-button.tsx
├── lib/
│   ├── auth/                   # Better Auth config + session helpers
│   ├── db/                     # Prisma client
│   ├── errors/                 # AppError + error codes
│   ├── services/               # music, favorite, playlist services
│   ├── utils/                  # cn, youtube parser, env
│   └── player.tsx              # Player context (queue, state)
├── prisma/
│   └── schema.prisma           # MongoDB schema with Better Auth models
├── pnpm-workspace.yaml         # pnpm v11 config (allowBuilds)
└── package.json
```
