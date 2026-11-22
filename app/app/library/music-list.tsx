'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { TrackRow, TrackListHeader, mapToQueue, type TrackRowItem } from '@/components/track-row';

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
const LATE_WATCH_CYCLES = 8; // ~24s — window for a late auto-enqueue

// Rows with an in-flight/failed download are hidden from the list — the
// floating Downloads widget owns them. `null` (never enqueued) and READY
// stay visible; mirrors the server-side predicate.
function rowVisible(m: TrackRowItem, patches: Record<string, DownloadPatch>) {
  const status = patches[m.id]?.downloadStatus ?? m.downloadStatus;
  return m.sourceType !== 'YOUTUBE' || status === 'READY' || status == null;
}

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

  // Poll /api/downloads/active while any row is in-flight OR might still
  // be auto-enqueued (a `null`-status YouTube row whose keepalive POST
  // from /app/add lands after this render). In-flight/failed rows vanish
  // via rowVisible; reload on READY so fresh props carry streamUrl.
  const [lateCycles, setLateCycles] = useState(0);
  useEffect(() => {
    const effective = (m: TrackRowItem) => patches[m.id]?.downloadStatus ?? m.downloadStatus;
    const inFlight = music.filter(
      (m) => effective(m) === 'PENDING' || effective(m) === 'PROCESSING',
    );
    const maybeEnqueued = music.filter(
      (m) => m.sourceType === 'YOUTUBE' && effective(m) == null,
    );
    if (inFlight.length === 0 && (maybeEnqueued.length === 0 || lateCycles >= LATE_WATCH_CYCLES))
      return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let hitReady = false;
      const next: Record<string, DownloadPatch> = {};
      try {
        const res = await fetch('/api/downloads/active');
        const active: { musicId: string; status: string; error: string | null }[] =
          (await res.json())?.data ?? [];
        const byMusic = new Map(active.map((d) => [d.musicId, d]));
        for (const m of [...inFlight, ...maybeEnqueued]) {
          const d = byMusic.get(m.id);
          if (d?.status) {
            next[m.id] = { downloadStatus: d.status, downloadError: d.error };
            continue;
          }
          // Not in the active feed — either it reached a terminal state
          // (READY isn't listed there) or a fast download skipped the
          // PENDING window entirely. Fetch its real status.
          const dlRes = await fetch(`/api/music/${m.id}/download`);
          const dl = (await dlRes.json())?.data;
          if (dl?.status) {
            next[m.id] = { downloadStatus: dl.status, downloadError: dl.error ?? null };
            if (dl.status === 'READY') hitReady = true;
          }
        }
      } catch {
        // transient — keep polling
      }
      if (cancelled) return;
      if (inFlight.length === 0 && maybeEnqueued.length > 0)
        setLateCycles((c) => c + 1);
      setPatches((p) => ({ ...p, ...next }));
      // Soft refetch — the patch already reveals the row; refreshed props
      // carry its streamUrl for playback.
      if (hitReady) router.refresh();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [music, patches, lateCycles, router]);

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

  const visible = music.filter((m) => rowVisible(m, patches));

  return (
    <div className="flex flex-col gap-0.5">
      <TrackListHeader />
      {visible.map((item, index) => (
        <TrackRow
          key={item.id}
          track={{ ...item, ...patches[item.id] }}
          queue={visible.map((m) => ({ ...m, ...patches[m.id] }))}
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
