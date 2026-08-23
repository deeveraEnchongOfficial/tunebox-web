'use client';

import Link from 'next/link';
import { Music, ListMusic, Play, Pause } from 'lucide-react';

import { usePlayer, type QueueItem } from '@/lib/player';
import { cn } from '@/lib/utils/cn';

interface MediaCardProps {
  href: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string | null;
  queue?: QueueItem[];
  trackId?: string;
  rounded?: 'full' | 'lg';
  icon?: 'music' | 'playlist';
}

export function MediaCard({
  href,
  title,
  subtitle,
  thumbnailUrl,
  queue,
  trackId,
  rounded = 'lg',
  icon = 'music',
}: MediaCardProps) {
  const player = usePlayer();
  const isCurrent = trackId ? player.current?.id === trackId : false;
  const isPlaying = isCurrent && player.isPlaying;

  function handlePlay(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!queue || queue.length === 0) return;
    if (isCurrent) {
      player.togglePlay();
      return;
    }
    const idx = trackId ? queue.findIndex((q) => q.id === trackId) : 0;
    player.playQueue(queue, idx < 0 ? 0 : idx);
  }

  const canPlay = !!queue && queue.length > 0;

  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 p-3 sm:p-4 rounded-lg bg-card hover:bg-secondary transition-colors duration-300"
    >
      <div className="relative aspect-square shrink-0">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={title}
            className={cn(
              'h-full w-full object-cover shadow-lg',
              rounded === 'full' ? 'rounded-full' : 'rounded-md',
            )}
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-linear-to-br from-indigo-500/40 to-purple-600/40',
              rounded === 'full' ? 'rounded-full' : 'rounded-md',
            )}
          >
            {icon === 'playlist' ? (
              <ListMusic className="h-10 w-10 text-white/80" />
            ) : (
              <Music className="h-10 w-10 text-white/80" />
            )}
          </div>
        )}
        {canPlay && (
          <button
            onClick={handlePlay}
            className={cn(
              'absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-black/40 transition-all duration-300',
              isPlaying
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 hover:bg-green-hover',
            )}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 translate-x-px" />
            )}
          </button>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </Link>
  );
}
