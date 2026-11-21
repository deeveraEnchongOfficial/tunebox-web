import { notFound } from 'next/navigation';
import { Music } from 'lucide-react';

import { type QueueItem } from '@/lib/player';
import { getSessionUser } from '@/lib/auth/session';
import { AddTracksDialog } from './add-tracks-dialog';
import { PlaylistTrackList } from './playlist-track-list';
import { PlaylistPlayButtonClient } from './playlist-play-button';
import { prisma } from '@/lib/db';
import { playbackFields } from '@/lib/services/music-service';
import { TopBar } from '../../top-bar';

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;

  const { id } = await params;
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          music: {
            select: {
              id: true,
              title: true,
              artist: true,
              channelName: true,
              thumbnailUrl: true,
              durationSeconds: true,
              sourceUrl: true,
              sourceType: true,
              downloads: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { status: true, error: true },
              },
            },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!playlist || playlist.userId !== user.id) notFound();

  const queue = playlist.items
    .map((i) => i.music)
    .filter(Boolean)
    .map((m) => ({ ...m, streamUrl: playbackFields(m!).streamUrl })) as QueueItem[];
  const firstThumb = queue[0]?.thumbnailUrl ?? null;

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-72 bg-linear-to-b from-indigo-600/50 via-indigo-600/10 to-transparent pointer-events-none" />

      <TopBar />

      <div className="relative px-4 md:px-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 mb-6">
          <div className="flex h-40 w-40 sm:h-48 sm:w-48 items-center justify-center rounded shadow-2xl shrink-0 overflow-hidden bg-linear-to-br from-indigo-500 to-purple-700">
            {firstThumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={firstThumb} alt={playlist.name} className="h-full w-full object-cover" />
            ) : (
              <Music className="h-16 w-16 text-white/80" />
            )}
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Playlist</p>
            <h1 className="text-3xl md:text-6xl font-extrabold tracking-tight truncate mb-3">
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="text-muted-foreground mb-2">{playlist.description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {user.name} • {playlist.items.length} {playlist.items.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>

        {/* Action row: big green play + add tracks */}
        <div className="flex items-center gap-4 mb-6">
          <PlaylistPlayButtonClient queue={queue} />
          <AddTracksDialog
            playlistId={playlist.id}
            existingIds={new Set(playlist.items.map((i) => i.musicId))}
          />
        </div>

        {playlist.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Music className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              This playlist is empty. Add songs from your library.
            </p>
          </div>
        ) : (
          <PlaylistTrackList playlistId={playlist.id} tracks={queue} />
        )}
      </div>
    </div>
  );
}
