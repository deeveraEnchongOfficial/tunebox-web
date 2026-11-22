'use client';

import { Music, Play, Pause, Heart, Trash2, Loader2, ListMusic, Download, Check, RotateCcw, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePlayer, type QueueItem } from '@/lib/player';
import { AddToPlaylistDialog } from '@/app/app/library/add-to-playlist-dialog';
import { cn } from '@/lib/utils/cn';

export interface TrackRowItem {
  id: string;
  title: string;
  artist: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  sourceUrl: string;
  sourceType: 'YOUTUBE' | 'AUTHORIZED_AUDIO';
  streamUrl?: string | null;
  downloadStatus?: string | null;
  downloadError?: string | null;
}

interface TrackRowProps {
  track: TrackRowItem;
  queue: TrackRowItem[];
  index?: number;
  favorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onDownload?: (id: string) => void;
  onDelete?: (id: string) => void;
  busyId?: string | null;
  trailing?: React.ReactNode;
}

export function TrackRow({
  track,
  queue,
  index,
  favorite,
  onToggleFavorite,
  onDownload,
  onDelete,
  busyId,
  trailing,
}: TrackRowProps) {
  const player = usePlayer();
  const isCurrent = player.current?.id === track.id;
  const isPlaying = isCurrent && player.isPlaying;
  const busy = busyId === track.id;

  function play() {
    if (isCurrent) {
      player.togglePlay();
      return;
    }
    const q = queue.map(mapToQueue);
    const i = queue.findIndex((m) => m.id === track.id);
    player.playQueue(q, i < 0 ? 0 : i);
  }

  return (
    <div
      onClick={play}
      className={cn(
        'group grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[1rem_2.5rem_1fr_auto] items-center gap-3 rounded-md px-2 sm:px-4 py-1.5 sm:py-2 transition-colors',
        isCurrent ? 'bg-white/10' : 'hover:bg-white/5',
      )}
    >
      {/* Index / playing indicator — desktop only, Spotify style */}
      <div className="hidden sm:flex items-center justify-center w-4">
        {isCurrent ? (
          <>
            <span className="group-hover:hidden">
              {isPlaying ? (
                <span className="flex items-end gap-px h-3.5" aria-hidden>
                  <span className="eq-bar w-[3px] h-full bg-primary rounded-sm" style={{ animationDelay: '0s' }} />
                  <span className="eq-bar w-[3px] h-full bg-primary rounded-sm" style={{ animationDelay: '0.25s' }} />
                  <span className="eq-bar w-[3px] h-full bg-primary rounded-sm" style={{ animationDelay: '0.5s' }} />
                </span>
              ) : (
                <Play className="h-3.5 w-3.5 text-primary fill-primary" />
              )}
            </span>
            <button
              onClick={play}
              className="hidden text-foreground group-hover:flex"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground tabular-nums group-hover:hidden">
              {index !== undefined ? index + 1 : ''}
            </span>
            <button
              onClick={play}
              className="hidden text-foreground group-hover:flex"
              aria-label="Play"
            >
              <Play className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail */}
      <div className="relative shrink-0">
        {track.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.thumbnailUrl}
            alt={track.title}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
            <Music className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {/* Mobile playing badge — no index column on small screens */}
        {isCurrent && isPlaying && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary sm:hidden" aria-hidden>
            <span className="flex items-end gap-px h-2">
              <span className="eq-bar w-[2px] h-full bg-primary-foreground" style={{ animationDelay: '0s' }} />
              <span className="eq-bar w-[2px] h-full bg-primary-foreground" style={{ animationDelay: '0.25s' }} />
              <span className="eq-bar w-[2px] h-full bg-primary-foreground" style={{ animationDelay: '0.5s' }} />
            </span>
          </span>
        )}
      </div>

      {/* Title + artist */}
      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-sm font-medium',
            isCurrent ? 'text-primary' : 'text-foreground',
          )}
        >
          {track.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {track.artist ?? track.channelName ?? 'Unknown artist'}
        </p>
      </div>

      {/* Actions — stopPropagation keeps button taps from playing the row */}
      <div className="flex items-center gap-1 sm:gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
        {track.durationSeconds && (
          <span className="text-xs text-muted-foreground tabular-nums hidden sm:block mr-2">
            {Math.floor(track.durationSeconds / 60)}:
            {(track.durationSeconds % 60).toString().padStart(2, '0')}
          </span>
        )}
        {onDownload && track.sourceType === 'YOUTUBE' && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (track.downloadStatus !== 'READY' && track.downloadStatus !== 'PENDING' && track.downloadStatus !== 'PROCESSING') {
                onDownload(track.id);
              }
            }}
            disabled={busy || track.downloadStatus === 'READY' || track.downloadStatus === 'PENDING' || track.downloadStatus === 'PROCESSING'}
            className={cn(
              'h-8 w-8',
              track.downloadStatus === 'READY' || track.downloadStatus === 'PENDING' || track.downloadStatus === 'PROCESSING'
                ? 'text-primary opacity-100'
                : 'text-muted-foreground opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto hover:text-foreground',
              track.downloadStatus === 'FAILED' && 'text-destructive opacity-100',
            )}
            title={
              track.downloadStatus === 'FAILED'
                ? `Download failed${track.downloadError ? `: ${track.downloadError}` : ''} — click to retry`
                : track.downloadStatus === 'READY'
                  ? 'MP3 saved'
                  : track.downloadStatus === 'PENDING' || track.downloadStatus === 'PROCESSING'
                    ? 'Downloading…'
                    : 'Download MP3'
            }
          >
            {track.downloadStatus === 'READY' ? (
              <Check className="h-4 w-4" />
            ) : track.downloadStatus === 'PENDING' || track.downloadStatus === 'PROCESSING' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : track.downloadStatus === 'FAILED' ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        )}
        {onToggleFavorite && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onToggleFavorite(track.id)}
            disabled={busy}
            className={cn(
              'h-8 w-8',
              favorite
                ? 'text-primary opacity-100'
                : 'text-muted-foreground opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto hover:text-foreground',
            )}
            title="Favorite"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={cn('h-4 w-4', favorite && 'fill-primary')} />
            )}
          </Button>
        )}
        <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto transition-opacity">
          <AddToPlaylistDialog musicId={track.id} musicTitle={track.title} />
        </div>
        {onDelete && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(track.id)}
            disabled={busy}
            className="h-8 w-8 text-muted-foreground opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto hover:text-destructive"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {trailing}
      </div>
    </div>
  );
}

/** Spotify-style column header for track lists (desktop only). */
export function TrackListHeader() {
  return (
    <div className="sticky top-16 z-10 hidden sm:grid grid-cols-[1rem_2.5rem_1fr_auto] items-center gap-3 border-b border-white/10 bg-background/95 backdrop-blur px-4 py-2 mb-2 text-xs uppercase tracking-wider text-muted-foreground">
      <span className="text-center">#</span>
      <span />
      <span>Title</span>
      <span className="flex justify-end pr-2">
        <Clock className="h-4 w-4" />
      </span>
    </div>
  );
}

export function mapToQueue(item: TrackRowItem): QueueItem {
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    channelName: item.channelName,
    thumbnailUrl: item.thumbnailUrl,
    sourceUrl: item.sourceUrl,
    sourceType: item.sourceType,
    durationSeconds: item.durationSeconds,
    streamUrl: item.streamUrl ?? null,
  };
}

export { ListMusic };
