'use client';

import { Music } from 'lucide-react';

import { usePlayer, type QueueItem } from '@/lib/player';

/** Spotify-style recents grid: artwork tiles that resume playback on tap. */
export function RecentTiles({ queue }: { queue: QueueItem[] }) {
  const player = usePlayer();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-10">
      {queue.map((t, i) => {
        const isCurrent = player.current?.id === t.id;
        const playing = isCurrent && player.isPlaying;
        return (
          <button
            key={t.id}
            onClick={() => (isCurrent ? player.togglePlay() : player.playQueue(queue, i))}
            className="group flex items-center gap-3 h-14 rounded-md bg-white/5 hover:bg-white/15 transition-colors overflow-hidden text-left"
          >
            {t.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.thumbnailUrl}
                alt={t.title}
                className="h-full w-14 shrink-0 object-cover"
              />
            ) : (
              <div className="flex h-full w-14 shrink-0 items-center justify-center bg-linear-to-br from-primary/60 to-primary/20">
                <Music className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <span className="min-w-0 flex-1 truncate pr-2 text-sm font-semibold">
              {t.title}
            </span>
            {playing && (
              <span className="mr-3 flex items-end gap-px h-3.5 shrink-0" aria-hidden>
                <span className="eq-bar w-[3px] h-full bg-primary rounded-sm" style={{ animationDelay: '0s' }} />
                <span className="eq-bar w-[3px] h-full bg-primary rounded-sm" style={{ animationDelay: '0.25s' }} />
                <span className="eq-bar w-[3px] h-full bg-primary rounded-sm" style={{ animationDelay: '0.5s' }} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
