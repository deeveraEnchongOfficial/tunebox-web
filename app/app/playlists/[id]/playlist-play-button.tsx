'use client';

import { Play, Pause } from 'lucide-react';

import { usePlayer, type QueueItem } from '@/lib/player';

export function PlaylistPlayButtonClient({ queue }: { queue: QueueItem[] }) {
  const player = usePlayer();
  const currentInQueue = player.current
    ? queue.some((q) => q.id === player.current?.id)
    : false;
  const isPlaying = currentInQueue && player.isPlaying;

  function handleClick() {
    if (currentInQueue) {
      player.togglePlay();
      return;
    }
    if (queue.length > 0) player.playQueue(queue, 0);
  }

  return (
    <button
      onClick={handleClick}
      disabled={queue.length === 0}
      className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-black/40 hover:scale-105 hover:bg-green-hover transition-all disabled:opacity-40 disabled:hover:scale-100"
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
      {isPlaying ? (
        <Pause className="h-6 w-6 md:h-7 md:w-7" />
      ) : (
        <Play className="h-6 w-6 md:h-7 md:w-7 translate-x-px" />
      )}
    </button>
  );
}
