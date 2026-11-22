import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors/AppError';
import { ErrorCode } from '@/lib/errors/codes';
import { parseYouTubeVideoId } from '@/lib/utils/youtube';
import type { DownloadStatus, Music } from '@prisma/client';
import { SourceType } from '@prisma/client';

const latestDownloadInclude = {
  downloads: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { status: true, error: true },
  },
};

/** Derived playback fields — usable by both serialized music payloads and
 * pages that query prisma directly with a downloads select. */
export function playbackFields(music: {
  id: string;
  downloads?: { status: DownloadStatus; error?: string | null }[];
}) {
  const latest = music.downloads?.[0] ?? null;
  return {
    downloadStatus: latest?.status ?? null,
    downloadError: latest?.error ?? null,
    streamUrl: latest?.status === 'READY' ? `/api/music/${music.id}/stream` : null,
  };
}

// A saved track is hidden while a download is in flight or failed —
// the floating widget owns those states. `null` (never enqueued) stays
// visible so the row's Download button remains the recovery path.
export function visibleInLibrary(m: { sourceType: string; downloadStatus?: string | null }) {
  return (
    m.sourceType !== 'YOUTUBE' ||
    m.downloadStatus === 'READY' ||
    // DELETED = user dismissed the failed download — the row stays
    // reachable with its Download button as the retry path.
    m.downloadStatus === 'DELETED' ||
    m.downloadStatus == null
  );
}

/** Attach derived playback fields and hide the downloads relation. */
export function serializeMusic<
  T extends Music & { downloads?: { status: DownloadStatus; error?: string | null }[] },
>(music: T) {
  const rest = { ...music };
  delete rest.downloads;
  return { ...rest, ...playbackFields(music) };
}

export const musicService = {
  /** Resolve a YouTube URL into metadata (bookmark/reference only). */
  async resolve(url: string) {
    const videoId = parseYouTubeVideoId(url);
    if (!videoId) {
      throw new AppError({ code: ErrorCode.INVALID_URL, message: 'Invalid YouTube URL.' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    let title = 'YouTube Video';
    let channelName: string | null = null;
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let durationSeconds: number | null = null;

    if (apiKey) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`,
          { next: { revalidate: 0 } },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            items: Array<{
              snippet: { title: string; channelTitle: string; thumbnails: { high?: { url: string }; medium?: { url: string }; default: { url: string } } };
              contentDetails: { duration: string };
            }>;
          };
          const item = data.items[0];
          if (item) {
            title = item.snippet.title;
            channelName = item.snippet.channelTitle;
            thumbnailUrl =
              item.snippet.thumbnails.high?.url ??
              item.snippet.thumbnails.medium?.url ??
              item.snippet.thumbnails.default.url;
            durationSeconds = parseISODuration(item.contentDetails.duration);
          }
        }
      } catch {
        // Fall through to default metadata on API error.
      }
    }

    return {
      sourceType: 'YOUTUBE' as const,
      sourceId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      artist: channelName,
      channelName,
      thumbnailUrl,
      durationSeconds,
      downloadAvailable: false,
    };
  },

  /** Save a resolved track to the user'\''s library. */
  async create(userId: string, input: {
    sourceType: SourceType;
    sourceId: string;
    sourceUrl: string;
    title: string;
    artist?: string | null;
    channelName?: string | null;
    thumbnailUrl?: string | null;
    durationSeconds?: number | null;
  }) {
    const existing = await prisma.music.findUnique({
      where: {
        userId_sourceType_sourceId: {
          userId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
    });
    if (existing) {
      throw new AppError({ code: ErrorCode.DUPLICATE_MUSIC, message: 'Already in your library.' });
    }

    const music = await prisma.music.create({
      data: {
        userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourceUrl: input.sourceUrl,
        title: input.title,
        artist: input.artist,
        channelName: input.channelName,
        thumbnailUrl: input.thumbnailUrl,
        durationSeconds: input.durationSeconds,
      },
    });
    return serializeMusic({ ...music, downloads: [] });
  },

  async list(userId: string, opts: { cursor?: string; limit?: number } = {}) {
    const limit = Math.min(opts.limit ?? 50, 100);
    const items = await prisma.music.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: latestDownloadInclude,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > limit;
    return {
      items: items
        .slice(0, limit)
        .map(serializeMusic)
        .filter(visibleInLibrary),
      nextCursor: hasMore ? items[limit - 1]?.id ?? null : null,
      hasMore,
    };
  },

  async getById(id: string, userId: string) {
    const music = await prisma.music.findUnique({
      where: { id },
      include: latestDownloadInclude,
    });
    if (!music || music.userId !== userId) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: 'Music not found.' });
    }
    return serializeMusic(music);
  },

  async update(id: string, userId: string, data: { title?: string; artist?: string | null }) {
    await this.getById(id, userId);
    const music = await prisma.music.update({
      where: { id },
      data,
      include: latestDownloadInclude,
    });
    return serializeMusic(music);
  },

  async delete(id: string, userId: string) {
    await this.getById(id, userId);
    const downloads = await prisma.download.findMany({
      where: { musicId: id, storageKey: { not: null } },
      select: { storageKey: true },
    });
    const { driveService } = await import('@/lib/services/drive-service');
    for (const d of downloads) {
      if (d.storageKey) await driveService.deleteFile(d.storageKey);
    }
    await prisma.music.delete({ where: { id } });
  },
};

function parseISODuration(iso: string): number | null {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!match) return null;
  const [, h, m, s] = match;
  const hours = parseInt(h ?? '0', 10);
  const minutes = parseInt(m ?? '0', 10);
  const seconds = parseInt(s ?? '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}
