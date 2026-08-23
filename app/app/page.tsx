import Link from 'next/link';
import { Plus, Music, Heart, ListMusic, Library } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export default async function AppHomePage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [musicCount, favoritesCount, playlistsCount] = await Promise.all([
    prisma.music.count({ where: { userId: user.id } }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.playlist.count({ where: { userId: user.id } }),
  ]);

  const recentMusic = await prisma.music.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name}</h1>
      <p className="text-muted-foreground mb-8">Your personal music library at a glance.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{musicCount}</p>
              <p className="text-sm text-muted-foreground">Songs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{favoritesCount}</p>
              <p className="text-sm text-muted-foreground">Favorites</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ListMusic className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{playlistsCount}</p>
              <p className="text-sm text-muted-foreground">Playlists</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Recently added</h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/add">
            <Plus className="h-4 w-4" />
            Add music
          </Link>
        </Button>
      </div>

      {recentMusic.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Library className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Your library is empty.</p>
            <Button asChild>
              <Link href="/app/add">Add your first song</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {recentMusic.map((music) => (
            <Link
              key={music.id}
              href="/app/library"
              className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent transition-colors"
            >
              {music.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={music.thumbnailUrl}
                  alt={music.title}
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                  <Music className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{music.title}</p>
                <p className="text-sm text-muted-foreground truncate">{music.artist ?? 'Unknown'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
