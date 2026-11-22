'use client';

import { Play, Pause, Shuffle } from 'lucide-react';

import { usePlayer, type QueueItem } from '@/lib/player';
import { cn } from '@/lib/utils/cn';

/** Spotify-style action row: shuffle toggle + big green play button. */
export function QueueControls({ queue }: { queue: QueueItem[] }) {
  const player = usePlayer();
  const currentInQueue = player.current
    ? queue.some((q) => q.id === player.current?.id)
    : false;
  const isPlaying = currentInQueue && player.isPlaying;

  function handlePlay() {
    if (currentInQueue) {
      player.togglePlay();
      return;
    }
    if (queue.length === 0) return;
    if (player.shuffle) {
      player.playQueue(queue, Math.floor(Math.random() * queue.length));
    } else {
      player.playQueue(queue, 0);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <button
        onClick={handlePlay}
        disabled={queue.length === 0}
        className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-black/40 hover:scale-105 hover:bg-green-hover transition-all disabled:opacity-40 disabled:hover:scale-100"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 md:h-6 md:w-6" />
        ) : (
          <Play className="h-5 w-5 md:h-6 md:w-6 translate-x-px" />
        )}
      </button>
      <button
        onClick={player.toggleShuffle}
        className={cn(
          'relative transition-colors',
          player.shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
        title={player.shuffle ? 'Shuffle on' : 'Shuffle off'}
        aria-label="Toggle shuffle"
      >
        <Shuffle className="h-6 w-6 md:h-7 md:w-7" />
        {player.shuffle && (
          <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
        )}
      </button>
    </div>
  );
}
