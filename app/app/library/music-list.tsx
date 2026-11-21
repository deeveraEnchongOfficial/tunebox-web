'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [patches, setPatches] = useState<Record<string, DownloadPatch>>({});

  // The nav Link prefetches this page's payload — it can be stale relative
  // to a download row created moments ago on the add page. Refresh once.
  useEffect(() => {
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll rows with in-flight downloads (auto-enqueued from /app/add or
  // retried) — patch status in place; hard-reload on a terminal state so
  // the server-rendered props pick up streamUrl.
  useEffect(() => {
    const effective = (m: TrackRowItem) => patches[m.id]?.downloadStatus ?? m.downloadStatus;
    const pending = music.filter(
      (m) => effective(m) === 'PENDING' || effective(m) === 'PROCESSING',
    );
    if (pending.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let hitTerminal = false;
      const next: Record<string, DownloadPatch> = {};
      for (const m of pending) {
        try {
          const res = await fetch(`/api/music/${m.id}/download`);
          const dl = (await res.json())?.data;
          if (dl?.status) {
            next[m.id] = { downloadStatus: dl.status, downloadError: dl.error ?? null };
            if (dl.status === 'READY' || dl.status === 'FAILED') hitTerminal = true;
          }
        } catch {
          // transient — keep polling
        }
      }
      if (cancelled) return;
      setPatches((p) => ({ ...p, ...next }));
      if (hitTerminal) window.location.reload();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [music, patches]);

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
