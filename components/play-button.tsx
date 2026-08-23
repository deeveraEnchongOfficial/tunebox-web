'use client';

import { useState } from 'react';
import { Music, Loader2 } from 'lucide-react';

import { usePlayer, type QueueItem } from '@/lib/player';

interface PlayButtonProps {
  track: QueueItem;
  queue?: QueueItem[];
  size?: 'sm' | 'md';
}

export function PlayButton({ track, queue, size = 'md' }: PlayButtonProps) {
  const player = usePlayer();
  const [loading, setLoading] = useState(false);

  const isCurrent = player.current?.id === track.id;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

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
      className={
        size === 'sm'
          ? 'flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90'
          : 'flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90'
      }
    >
      {loading ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : isCurrent && player.isPlaying ? (
        <Music className={iconSize} />
      ) : (
        <Music className={iconSize} />
      )}
    </button>
  );
}
