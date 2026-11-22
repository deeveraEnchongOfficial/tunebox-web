import { Heart, Library } from 'lucide-react';

import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { playbackFields, visibleInLibrary } from '@/lib/services/music-service';
import { MusicList } from './music-list';
import { TopBar } from '../top-bar';

const musicSelect = {
  id: true,
  title: true,
  artist: true,
  channelName: true,
  thumbnailUrl: true,
  durationSeconds: true,
  sourceUrl: true,
  sourceType: true,
  downloads: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { status: true, error: true },
  },
};

export default async function LibraryPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [music, favorites] = await Promise.all([
    prisma.music.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: musicSelect,
    }),
    prisma.favorite.findMany({
      where: { userId: user.id },
      include: {
        music: { select: musicSelect },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const favoriteIds = new Set(favorites.map((f) => f.musicId));
  const favoriteMusic = favorites.map((f) => f.music).filter((m) => m !== null);
  const withPlayback = (m: (typeof music)[number]) => ({ ...m, ...playbackFields(m) });
  const visibleMusic = music.map(withPlayback).filter(visibleInLibrary);
  const visibleFavorites = favoriteMusic.map(withPlayback).filter(visibleInLibrary);

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-64 bg-linear-to-b from-indigo-600/30 via-indigo-600/5 to-transparent pointer-events-none" />

      <TopBar />

      <div className="relative px-4 md:px-6 pb-12">
        <div className="flex items-end gap-4 mb-6">
          <div className="flex h-16 w-16 md:h-24 md:w-24 items-center justify-center rounded bg-linear-to-br from-indigo-500 to-purple-700 shadow-lg shrink-0">
            <Library className="h-8 w-8 md:h-12 md:w-12 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Playlist</p>
            <h1 className="text-2xl md:text-5xl font-extrabold tracking-tight truncate">Your Library</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {visibleMusic.length} {visibleMusic.length === 1 ? 'song' : 'songs'} in your collection
            </p>
          </div>
        </div>

        {visibleMusic.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Library className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Your library is empty. Add some music to get started.</p>
          </div>
        ) : (
          <MusicList music={visibleMusic} favoriteIds={favoriteIds} />
        )}

        {visibleFavorites.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-primary fill-primary" />
              <h2 className="text-xl md:text-2xl font-bold">Liked Songs</h2>
            </div>
            <MusicList music={visibleFavorites} favoriteIds={favoriteIds} />
          </div>
        )}
      </div>
    </div>
  );
}
