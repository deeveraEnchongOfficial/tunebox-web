import { notFound } from 'next/navigation';
import { Music } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { type QueueItem } from '@/lib/player';
import { getSessionUser } from '@/lib/auth/session';
import { AddTracksDialog } from './add-tracks-dialog';
import { PlaylistTrackList } from './playlist-track-list';
import { prisma } from '@/lib/db';

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
            },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!playlist || playlist.userId !== user.id) notFound();

  const queue = playlist.items.map((i) => i.music).filter(Boolean) as QueueItem[];

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <div className="flex items-start gap-6 mb-8">
        <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-muted shrink-0">
          <Music className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-muted-foreground mb-2">{playlist.description}</p>
          )}
          <p className="text-sm text-muted-foreground mb-4">
            {playlist.items.length} {playlist.items.length === 1 ? 'song' : 'songs'}
          </p>
          <AddTracksDialog
            playlistId={playlist.id}
            existingIds={new Set(playlist.items.map((i) => i.musicId))}
          />
        </div>
      </div>

      {playlist.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Music className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              This playlist is empty. Add songs from your library.
            </p>
          </CardContent>
        </Card>
      ) : (
        <PlaylistTrackList playlistId={playlist.id} tracks={queue} />
      )}
    </div>
  );
}
