'use client';

import * as React from 'react';
import { Plus, Loader2, Music, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MusicItem {
  id: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

export function AddTracksDialog({ playlistId, existingIds }: { playlistId: string; existingIds: Set<string> }) {
  const [open, setOpen] = React.useState(false);
  const [tracks, setTracks] = React.useState<MusicItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [adding, setAdding] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState<Set<string>>(new Set());

  async function loadTracks() {
    setLoading(true);
    try {
      const res = await fetch('/api/music');
      const data = await res.json();
      if (data.success) {
        setTracks(data.data.items ?? []);
      }
    } catch {}
    setLoading(false);
  }

  React.useEffect(() => {
    if (open) {
      loadTracks();
      setAdded(new Set());
    }
  }, [open]);

  async function addTrack(musicId: string) {
    setAdding(musicId);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicId }),
      });
      const data = await res.json();
      if (data.success) {
        setAdded((prev) => new Set(prev).add(musicId));
      }
    } catch {}
    setAdding(null);
  }

  const available = tracks.filter((t) => !existingIds.has(t.id) && !added.has(t.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4" />
          Add tracks
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add tracks to playlist</DialogTitle>
          <DialogDescription>Pick from your library.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : available.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            All your tracks are already in this playlist.
          </p>
        ) : (
          <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
            {available.map((track) => (
              <div key={track.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors">
                {track.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.thumbnailUrl} alt={track.title} className="h-10 w-10 rounded object-cover shrink-0" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted shrink-0">
                    <Music className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist ?? 'Unknown'}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => addTrack(track.id)}
                  disabled={adding === track.id}
                >
                  {adding === track.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}

        {added.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-primary pt-2 border-t">
            <Check className="h-4 w-4" />
            Added {added.size} {added.size === 1 ? 'track' : 'tracks'}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => window.location.reload()}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
