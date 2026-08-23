'use client';

import { TrackRow, type TrackRowItem } from '@/components/track-row';
import { type QueueItem } from '@/lib/player';
import { RemoveFromPlaylistButton } from './remove-from-playlist-button';

export function PlaylistTrackList({
  playlistId,
  tracks,
}: {
  playlistId: string;
  tracks: QueueItem[];
}) {
  const queue: TrackRowItem[] = tracks.map((t) => ({ ...t }));

  return (
    <div className="flex flex-col gap-0.5">
      {tracks.map((track, index) => (
        <TrackRow
          key={track.id}
          track={track}
          queue={queue}
          index={index}
          trailing={<RemoveFromPlaylistButton playlistId={playlistId} musicId={track.id} />}
        />
      ))}
    </div>
  );
}
