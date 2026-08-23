'use client';

import * as React from 'react';
import { ListMusic, Loader2, Plus, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Playlist {
  id: string;
  name: string;
  _count?: { items: number };
}

export function AddToPlaylistDialog({ musicId, musicTitle }: { musicId: string; musicTitle: string }) {
  const [open, setOpen] = React.useState(false);
  const [playlists, setPlaylists] = React.useState<Playlist[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [adding, setAdding] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  async function loadPlaylists() {
    setLoading(true);
    try {
      const res = await fetch('/api/playlists');
      const data = await res.json();
      if (data.success) setPlaylists(data.data);
    } catch {}
    setLoading(false);
  }

  React.useEffect(() => {
    if (open) {
      loadPlaylists();
      setAdded(new Set());
      setError(null);
      setShowCreate(false);
      setNewName('');
    }
  }, [open]);

  async function addToPlaylist(playlistId: string) {
    setAdding(playlistId);
    setError(null);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicId }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message ?? 'Failed to add');
      } else {
        setAdded((prev) => new Set(prev).add(playlistId));
      }
    } catch {
      setError('Network error');
    } finally {
      setAdding(null);
    }
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message ?? 'Failed to create playlist');
        return;
      }
      const playlist = data.data;
      await addToPlaylist(playlist.id);
      await loadPlaylists();
      setShowCreate(false);
      setNewName('');
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <ListMusic className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to playlist</DialogTitle>
          <DialogDescription className="truncate">&ldquo;{musicTitle}&rdquo;</DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : showCreate ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-playlist-name">Playlist name</Label>
              <Input
                id="new-playlist-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My new playlist"
                disabled={creating}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createAndAdd} disabled={creating || !newName.trim()}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create &amp; add
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
                Cancel
              </Button>
            </div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-muted-foreground text-center">
              No playlists yet. Create one to get started.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              New playlist
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {playlists.map((playlist) => {
              const isAdded = added.has(playlist.id);
              return (
                <button
                  key={playlist.id}
                  onClick={() => !isAdded && addToPlaylist(playlist.id)}
                  disabled={isAdded || adding === playlist.id}
                  className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-accent transition-colors disabled:opacity-60"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted shrink-0">
                    <ListMusic className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{playlist.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {playlist._count?.items ?? 0} {(playlist._count?.items ?? 0) === 1 ? 'song' : 'songs'}
                    </p>
                  </div>
                  {isAdded ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : adding === playlist.id ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : null}
                </button>
              );
            })}
            <div className="border-t mt-2 pt-2">
              <Button variant="ghost" onClick={() => setShowCreate(true)} className="w-full justify-start gap-2">
                <Plus className="h-4 w-4" />
                Create new playlist
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
