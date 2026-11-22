import Link from 'next/link';
import { Plus, Music, Heart, ListMusic, Library } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MediaCard } from '@/components/media-card';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { playbackFields, visibleInLibrary } from '@/lib/services/music-service';
import { TopBar } from './top-bar';
import type { QueueItem } from '@/lib/player';

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

export default async function AppHomePage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [musicCount, favoritesCount, playlistsCount, recentMusic, playlists] = await Promise.all([
    prisma.music.count({ where: { userId: user.id } }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.playlist.count({ where: { userId: user.id } }),
    prisma.music.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: musicSelect,
    }),
    prisma.playlist.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        items: {
          take: 1,
          include: {
            music: { select: musicSelect },
          },
        },
      },
    }),
  ]);

  const recentQueue: QueueItem[] = recentMusic
    .map((m) => ({
      id: m.id,
      title: m.title,
      artist: m.artist,
      channelName: m.channelName,
      thumbnailUrl: m.thumbnailUrl,
      sourceUrl: m.sourceUrl,
      sourceType: m.sourceType,
      durationSeconds: m.durationSeconds,
      streamUrl: playbackFields(m).streamUrl,
      downloadStatus: playbackFields(m).downloadStatus,
    }))
    .filter(visibleInLibrary);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const quickStats = [
    { label: 'Songs', value: musicCount, icon: Music, href: '/app/library' },
    { label: 'Favorites', value: favoritesCount, icon: Heart, href: '/app/library' },
    { label: 'Playlists', value: playlistsCount, icon: ListMusic, href: '/app/playlists' },
  ];

  return (
    <div className="relative">
      {/* Gradient header banner */}
      <div className="absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary/40 via-primary/10 to-transparent pointer-events-none" />

      <TopBar />

      <div className="relative px-4 md:px-6 pb-12">
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-6">
          {greeting}, {user.name}
        </h1>

        {/* Quick stat tiles — Spotify style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="group flex items-center gap-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors p-4 h-16 overflow-hidden"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded bg-linear-to-br from-primary/80 to-primary/40 shrink-0">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-base md:text-lg font-bold truncate">{stat.label}</span>
                <span className="ml-auto text-sm font-bold text-muted-foreground tabular-nums hidden sm:block">
                  {stat.value}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Recently added */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold">Recently added</h2>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/app/add">
                <Plus className="h-4 w-4" />
                Add music
              </Link>
            </Button>
          </div>

          {recentMusic.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Library className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Your library is empty.</p>
              <Button asChild>
                <Link href="/app/add">Add your first song</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-3">
              {recentMusic.map((music) => (
                <MediaCard
                  key={music.id}
                  href="/app/library"
                  title={music.title}
                  subtitle={music.artist ?? 'Unknown'}
                  thumbnailUrl={music.thumbnailUrl}
                  queue={recentQueue}
                  trackId={music.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Playlists */}
        {playlists.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold">Your playlists</h2>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Link href="/app/playlists">See all</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-3">
              {playlists.map((playlist) => {
                const firstTrack = playlist.items[0]?.music;
                const queue: QueueItem[] | undefined = firstTrack
                  ? [
                      {
                        id: firstTrack.id,
                        title: firstTrack.title,
                        artist: firstTrack.artist,
                        channelName: firstTrack.channelName,
                        thumbnailUrl: firstTrack.thumbnailUrl,
                        sourceUrl: firstTrack.sourceUrl,
                        sourceType: firstTrack.sourceType,
                        durationSeconds: firstTrack.durationSeconds,
                        streamUrl: playbackFields(firstTrack).streamUrl,
                      },
                    ]
                  : undefined;
                return (
                  <MediaCard
                    key={playlist.id}
                    href={`/app/playlists/${playlist.id}`}
                    title={playlist.name}
                    subtitle={`Playlist • ${user.name}`}
                    thumbnailUrl={firstTrack?.thumbnailUrl ?? null}
                    queue={queue}
                    trackId={firstTrack?.id}
                    icon="playlist"
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
