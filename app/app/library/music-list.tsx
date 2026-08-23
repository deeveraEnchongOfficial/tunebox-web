'use client';

import { useState } from 'react';

import { TrackRow, mapToQueue, type TrackRowItem } from '@/components/track-row';

interface MusicListProps {
  music: TrackRowItem[];
  favoriteIds: Set<string>;
}

export function MusicList({ music, favoriteIds }: MusicListProps) {
  const [busy, setBusy] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-0.5">
      {music.map((item, index) => (
        <TrackRow
          key={item.id}
          track={item}
          queue={music}
          index={index}
          favorite={favoriteIds.has(item.id)}
          onToggleFavorite={toggleFavorite}
          onDelete={deleteMusic}
          busyId={busy}
        />
      ))}
    </div>
  );
}

export { mapToQueue };
