'use client';

import { useState } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

import { usePlayer, type QueueItem } from '@/lib/player';

interface PlayButtonProps {
  track: QueueItem;
  queue?: QueueItem[];
  size?: 'sm' | 'md' | 'lg';
}

export function PlayButton({ track, queue, size = 'md' }: PlayButtonProps) {
  const player = usePlayer();
  const [loading, setLoading] = useState(false);

  const isCurrent = player.current?.id === track.id;
  const isPlaying = isCurrent && player.isPlaying;
  const dims =
    size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const iconSize = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  function handleClick() {
    if (isCurrent) {
      player.togglePlay();
      return;
    }
    setLoading(true);
    player.playTrack(track, queue);
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      className={`flex ${dims} items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/40 hover:scale-105 hover:bg-green-hover transition-all`}
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
      {loading ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : isPlaying ? (
        <Pause className={iconSize} />
      ) : (
        <Play className={`${iconSize} translate-x-px`} />
      )}
    </button>
  );
}
