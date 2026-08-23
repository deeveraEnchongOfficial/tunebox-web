'use client';

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  ChevronDown,
  Heart,
  ListMusic,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePlayer } from '@/lib/player';
import { cn } from '@/lib/utils/cn';

interface NowPlayingProps {
  progress: number;
  duration: number;
  onSeek: (value: number) => void;
  onSeekStart: () => void;
  onSeekEnd: () => void;
}

export function NowPlaying({
  progress,
  duration,
  onSeek,
  onSeekStart,
  onSeekEnd,
}: NowPlayingProps) {
  const player = usePlayer();
  const { current } = player;
  if (!current) return null;

  const progressPercent = duration ? (progress / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-linear-to-b from-indigo-900/60 via-background to-background animate-in fade-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        <button
          onClick={() => player.setExpanded(false)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Minimize"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
          Now Playing
        </p>
        <div className="w-10" />
      </div>

      {/* Artwork */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-12 min-h-0 py-6">
        {current.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.thumbnailUrl}
            alt={current.title}
            className="max-h-full max-w-full aspect-square w-full md:w-auto md:max-w-md rounded-lg object-cover shadow-2xl shadow-black/60"
          />
        ) : (
          <div className="flex aspect-square w-full md:w-auto md:max-w-md items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-700 shadow-2xl">
            <ListMusic className="h-20 w-20 text-white/80" />
          </div>
        )}
      </div>

      {/* Track info + controls */}
      <div className="flex flex-col gap-4 px-4 md:px-12 pb-8 md:pb-12 max-w-3xl w-full mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-extrabold tracking-tight truncate">
              {current.title}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground truncate mt-1">
              {current.artist ?? current.channelName ?? 'Unknown'}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 text-muted-foreground hover:text-primary shrink-0"
            title="Like"
          >
            <Heart className="h-6 w-6" />
          </Button>
        </div>

        {/* Seek bar */}
        <div className="flex items-center gap-3">
          <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
            {formatTime(progress)}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progressPercent}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            onMouseDown={onSeekStart}
            onMouseUp={onSeekEnd}
            onTouchStart={onSeekStart}
            onTouchEnd={onSeekEnd}
            className="flex-1 h-1 cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--primary) ${progressPercent}%, var(--muted) ${progressPercent}%)`,
              borderRadius: 2,
              appearance: 'none',
            }}
          />
          <span className="w-12 text-xs text-muted-foreground tabular-nums">
            {formatTime(duration)}
          </span>
        </div>

        {/* Transport */}
        <div className="flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            onClick={player.toggleShuffle}
            className={cn(
              'h-10 w-10',
              player.shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            title="Shuffle"
          >
            <Shuffle className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={player.previous}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Previous"
            >
              <SkipBack className="h-6 w-6 md:h-7 md:w-7" />
            </button>
            <button
              onClick={player.togglePlay}
              className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-black/40 hover:scale-105 hover:bg-green-hover transition-all"
              aria-label={player.isPlaying ? 'Pause' : 'Play'}
            >
              {player.isPlaying ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="h-7 w-7 translate-x-px" />
              )}
            </button>
            <button
              onClick={player.next}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Next"
            >
              <SkipForward className="h-6 w-6 md:h-7 md:w-7" />
            </button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={player.toggleRepeat}
            className={cn(
              'h-10 w-10',
              player.repeat ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            title="Repeat"
          >
            <Repeat className="h-5 w-5" />
          </Button>
        </div>

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => player.setMuted(!player.muted)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {player.muted || player.volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={player.muted ? 0 : player.volume}
            onChange={(e) => player.setVolume(parseFloat(e.target.value))}
            className="w-32 h-1 cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--foreground) ${(player.muted ? 0 : player.volume) * 100}%, var(--muted) ${(player.muted ? 0 : player.volume) * 100}%)`,
              borderRadius: 2,
              appearance: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
