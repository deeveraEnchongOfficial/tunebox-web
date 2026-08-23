import { Heart, Library } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { MusicList } from './music-list';

export default async function LibraryPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [music, favorites] = await Promise.all([
    prisma.music.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.favorite.findMany({
      where: { userId: user.id },
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
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const favoriteIds = new Set(favorites.map((f) => f.musicId));
  const favoriteMusic = favorites.map((f) => f.music).filter((m) => m !== null);

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Your library</h1>
      <p className="text-muted-foreground mb-8">{music.length} songs in your collection.</p>

      {music.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Library className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Your library is empty. Add some music to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <MusicList music={music} favoriteIds={favoriteIds} />
      )}

      {favoriteMusic.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Favorites</h2>
          </div>
          <MusicList music={favoriteMusic} favoriteIds={favoriteIds} />
        </div>
      )}
    </div>
  );
}
