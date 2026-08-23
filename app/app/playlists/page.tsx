import Link from 'next/link';
import { ListMusic } from 'lucide-react';

import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { CreatePlaylistDialog } from './create-playlist-dialog';
import { TopBar } from '../top-bar';

export default async function PlaylistsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    include: {
      items: {
        take: 1,
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
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-64 bg-linear-to-b from-purple-700/30 via-purple-700/5 to-transparent pointer-events-none" />

      <TopBar />

      <div className="relative px-4 md:px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">Playlists</h1>
          <CreatePlaylistDialog />
        </div>

        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ListMusic className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No playlists yet.</p>
            <CreatePlaylistDialog />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-3">
            {playlists.map((playlist) => {
              const firstTrack = playlist.items[0]?.music;
              return (
                <Link
                  key={playlist.id}
                  href={`/app/playlists/${playlist.id}`}
                  className="group relative flex flex-col gap-3 p-3 sm:p-4 rounded-lg bg-card hover:bg-secondary transition-colors duration-300"
                >
                  <div className="relative aspect-square shrink-0">
                    {firstTrack?.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={firstTrack.thumbnailUrl}
                        alt={playlist.name}
                        className="h-full w-full rounded-md object-cover shadow-lg"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-md bg-linear-to-br from-indigo-500/40 to-purple-600/40">
                        <ListMusic className="h-10 w-10 text-white/80" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{playlist.name}</p>
                    <p className="truncate text-xs text-muted-foreground mt-1">
                      {playlist._count.items} {playlist._count.items === 1 ? 'song' : 'songs'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
