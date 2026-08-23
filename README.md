# TuneBox Web

> Full-stack web app + backend API for TuneBox — a personal music library.
> **Independent project.** The Flutter mobile app (`../mobile`) is a separate repo and communicates with this API over HTTPS.
>
> **Live:** https://tunebox-web-chi.vercel.app

## Features

- **Authentication** — register, login, logout (Better Auth with email/password)
- **Music library** — paste a YouTube URL, fetch metadata via YouTube Data API, save to your library
- **Playback** — play YouTube tracks directly in the browser with a global player bar (play/pause, seek, volume, shuffle, repeat, auto-advance)
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

- YouTube URLs are treated as **bookmarks/references**, not as a source for audio extraction.
- This app does **not** download, extract, convert, or redistribute YouTube audio.
- Playback uses the official YouTube IFrame embed — no audio is extracted.
- Offline downloads work **only** for content the application is explicitly authorized to download and store.

## Prerequisites

- Node.js >= 22, pnpm v11+
- MongoDB Atlas connection string
- YouTube Data API key (optional but recommended — get one from [Google Cloud Console](https://console.cloud.google.com/))

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

## API routes

All routes (except `/api/auth/*` and `/api/health`) require authentication.

| Route | Methods | Description |
| --- | --- | --- |
| `/api/auth/[...all]` | GET, POST | Better Auth handler (register, login, logout, session) |
| `/api/health` | GET | Health check |
| `/api/music` | GET, POST | List music / Create music entry |
| `/api/music/resolve` | POST | Resolve YouTube URL to metadata |
| `/api/music/[id]` | GET, PATCH, DELETE | Get / update / delete a track |
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
