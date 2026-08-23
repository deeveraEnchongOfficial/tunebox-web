import Link from 'next/link';
import { ListMusic } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { CreatePlaylistDialog } from './create-playlist-dialog';

export default async function PlaylistsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Playlists</h1>
          <p className="text-muted-foreground">{playlists.length} playlists</p>
        </div>
        <CreatePlaylistDialog />
      </div>

      {playlists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <ListMusic className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No playlists yet.</p>
            <CreatePlaylistDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist) => (
            <Link key={playlist.id} href={`/app/playlists/${playlist.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex h-32 items-center justify-center rounded-lg bg-muted mb-4">
                    <ListMusic className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold truncate">{playlist.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {playlist._count.items} {playlist._count.items === 1 ? 'song' : 'songs'}
                  </p>
                  {playlist.description && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">{playlist.description}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
