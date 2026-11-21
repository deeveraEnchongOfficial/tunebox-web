'use client';

import { useState } from 'react';

import { TrackRow, mapToQueue, type TrackRowItem } from '@/components/track-row';

interface MusicListProps {
  music: TrackRowItem[];
  favoriteIds: Set<string>;
}

interface DownloadPatch {
  downloadStatus: string;
  downloadError?: string | null;
}

const POLL_MS = 3000;
const POLL_LIMIT = 120; // ~6 minutes

export function MusicList({ music, favoriteIds }: MusicListProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [patches, setPatches] = useState<Record<string, DownloadPatch>>({});

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

  async function downloadMusic(musicId: string) {
    setBusy(musicId);
    setPatches((p) => ({ ...p, [musicId]: { downloadStatus: 'PENDING' } }));
    try {
      await fetch(`/api/music/${musicId}/download`, { method: 'POST' });
      for (let i = 0; i < POLL_LIMIT; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const res = await fetch(`/api/music/${musicId}/download`);
        const body = await res.json();
        const dl = body?.data;
        if (dl?.status) {
          setPatches((p) => ({
            ...p,
            [musicId]: { downloadStatus: dl.status, downloadError: dl.error ?? null },
          }));
        }
        if (!dl || dl.status === 'READY' || dl.status === 'FAILED') break;
      }
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
          track={{ ...item, ...patches[item.id] }}
          queue={music.map((m) => ({ ...m, ...patches[m.id] }))}
          index={index}
          favorite={favoriteIds.has(item.id)}
          onToggleFavorite={toggleFavorite}
          onDownload={downloadMusic}
          onDelete={deleteMusic}
          busyId={busy}
        />
      ))}
    </div>
  );
}

export { mapToQueue };
