'use client';

import { Music, Play, Pause } from 'lucide-react';

import { usePlayer, type QueueItem } from '@/lib/player';
import { RemoveFromPlaylistButton } from './remove-from-playlist-button';

export function PlaylistTrackList({
  playlistId,
  tracks,
}: {
  playlistId: string;
  tracks: QueueItem[];
}) {
  const player = usePlayer();

  function playTrack(index: number) {
    player.playQueue(tracks, index);
  }

  return (
    <div className="flex flex-col gap-1">
      {tracks.map((track, index) => {
        const isCurrent = player.current?.id === track.id;
        return (
          <div
            key={track.id}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent transition-colors group"
          >
            <span className="text-muted-foreground text-sm w-6 text-center">{index + 1}</span>
            {track.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.thumbnailUrl}
                alt={track.title}
                className="h-12 w-12 rounded object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                <Music className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{track.title}</p>
              <p className="text-sm text-muted-foreground truncate">
                {track.artist ?? track.channelName ?? 'Unknown artist'}
              </p>
            </div>
            {track.durationSeconds && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                {Math.floor(track.durationSeconds / 60)}:
                {(track.durationSeconds % 60).toString().padStart(2, '0')}
              </span>
            )}
            <button
              onClick={() => playTrack(index)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isCurrent && player.isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </button>
            <RemoveFromPlaylistButton playlistId={playlistId} musicId={track.id} />
          </div>
        );
      })}
    </div>
  );
}
