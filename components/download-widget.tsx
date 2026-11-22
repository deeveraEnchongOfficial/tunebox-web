'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Download, Loader2, RotateCcw, X } from 'lucide-react';

interface ActiveDownload {
  id: string;
  musicId: string;
  title: string;
  status: 'PENDING' | 'PROCESSING' | 'FAILED';
  progress: number;
  error: string | null;
}

const POLL_MS = 2000;

// Floating bottom-right card showing every in-flight/failed download.
// Tracks stay hidden from the library until READY — this is where the
// user watches progress and retries failures.
export function DownloadWidget() {
  const router = useRouter();
  const [items, setItems] = useState<ActiveDownload[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyError(downloadId: string, error: string) {
    try {
      await navigator.clipboard.writeText(error);
      setCopied(downloadId);
      setTimeout(() => setCopied((c) => (c === downloadId ? null : c)), 1500);
    } catch {
      /* clipboard unavailable — the full text is also in the tooltip */
    }
  }

  async function dismiss(downloadId: string, musicId: string) {
    setDismissed((s) => new Set(s).add(downloadId));
    await fetch(`/api/music/${musicId}/download`, { method: 'DELETE' }).catch(() => {});
  }
  const prevIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch('/api/downloads/active');
        const body = await res.json().catch(() => null);
        const next: ActiveDownload[] = body?.success ? body.data : [];
        if (!cancelled) {
          setItems(next);
          // A download joining or leaving the feed changes list
          // visibility (hidden while active, revealed once READY) —
          // refresh the page's server-rendered props.
          const ids = new Set(next.map((i) => i.musicId));
          const changed =
            ids.size !== prevIds.current.size ||
            [...ids].some((id) => !prevIds.current.has(id));
          prevIds.current = ids;
          if (changed) router.refresh();
        }
      } catch {
        /* transient — keep polling */
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  async function retry(musicId: string, downloadId: string) {
    setRetrying(downloadId);
    try {
      await fetch(`/api/music/${musicId}/download`, { method: 'POST' });
      setDismissed((d) => {
        const next = new Set(d);
        next.delete(downloadId);
        return next;
      });
    } finally {
      setRetrying(null);
    }
  }

  const visible = items.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-40 md:bottom-44 right-3 sm:right-4 z-60 w-72 rounded-lg bg-card border border-white/10 shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <Download className="h-4 w-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wide">Downloads</p>
      </div>
      <ul className="divide-y divide-white/5">
        {visible.map((d) => (
          <li key={d.id} className="px-3 py-2.5">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-medium truncate">{d.title}</p>
              {d.status === 'FAILED' ? (
                <>
                  {d.error && (
                    <button
                      onClick={() => copyError(d.id, d.error!)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Copy error"
                    >
                      {copied === d.id ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => retry(d.musicId, d.id)}
                    disabled={retrying === d.id}
                    className="text-destructive hover:text-foreground disabled:opacity-50"
                    title={`Retry${d.error ? ` — ${d.error}` : ''}`}
                  >
                    {retrying === d.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => dismiss(d.id, d.musicId)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {d.progress}%
                </span>
              )}
            </div>
            {d.status === 'FAILED' ? (
              <p className="mt-1 text-xs text-destructive line-clamp-2 wrap-break-word" title={d.error ?? undefined}>
                {d.error ?? 'Download failed'}
              </p>
            ) : (
              <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-500"
                  style={{ width: `${d.progress}%` }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
