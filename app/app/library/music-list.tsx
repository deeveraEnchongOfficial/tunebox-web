'use client';

import { useState } from 'react';
import { Music, Heart, Trash2, Loader2, Play, Pause } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePlayer, type QueueItem } from '@/lib/player';
import { AddToPlaylistDialog } from './add-to-playlist-dialog';

interface MusicItem {
  id: string;
  title: string;
  artist: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  sourceUrl: string;
  sourceType: 'YOUTUBE' | 'AUTHORIZED_AUDIO';
}

interface MusicListProps {
  music: MusicItem[];
  favoriteIds: Set<string>;
}

export function MusicList({ music, favoriteIds }: MusicListProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const player = usePlayer();

  async function toggleFavorite(musicId: string) {
    setBusy(musicId);
    try {
      await fetch(`/api/music/${musicId}/favorite`, { method: 'POST' });
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }

  async function deleteMusic(musicId: string) {
    if (!confirm('Remove this song from your library?')) return;
    setBusy(musicId);
    try {
      await fetch(`/api/music/${musicId}`, { method: 'DELETE' });
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }

  function playTrack(item: MusicItem) {
    player.playTrack(mapToQueue(item), music.map(mapToQueue));
  }

  return (
    <div className="flex flex-col gap-1">
      {music.map((item) => {
        const isFav = favoriteIds.has(item.id);
        const isCurrent = player.current?.id === item.id;
        return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent transition-colors group"
          >
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbnailUrl} alt={item.title} className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                <Music className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.title}</p>
              <p className="text-sm text-muted-foreground truncate">
                {item.artist ?? 'Unknown artist'}
              </p>
            </div>
            {item.durationSeconds && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                {Math.floor(item.durationSeconds / 60)}:
                {(item.durationSeconds % 60).toString().padStart(2, '0')}
              </span>
            )}
            <button
              onClick={() => playTrack(item)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isCurrent && player.isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => toggleFavorite(item.id)}
              disabled={busy === item.id}
            >
              {busy === item.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={isFav ? 'h-4 w-4 fill-primary text-primary' : 'h-4 w-4'} />
              )}
            </Button>
            <AddToPlaylistDialog musicId={item.id} musicTitle={item.title} />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => deleteMusic(item.id)}
              disabled={busy === item.id}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function mapToQueue(item: MusicItem): QueueItem {
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    channelName: item.channelName,
    thumbnailUrl: item.thumbnailUrl,
    sourceUrl: item.sourceUrl,
    sourceType: item.sourceType,
    durationSeconds: item.durationSeconds,
  };
}
