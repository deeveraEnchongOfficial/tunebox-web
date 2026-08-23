'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link as LinkIcon, Loader2, Music, Heart, ListPlus, Bookmark } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResolvedMusic {
  sourceType: string;
  sourceId: string;
  url: string;
  title: string;
  artist: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  downloadAvailable: boolean;
}

export default function AddMusicPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedMusic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setResolving(true);
    setError(null);
    setResolved(null);

    try {
      const res = await fetch('/api/music/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message ?? 'Failed to resolve URL');
        return;
      }
      setResolved(data.data);
    } catch {
      setError('Network error');
    } finally {
      setResolving(false);
    }
  }

  async function handleSave() {
    if (!resolved) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...resolved,
          sourceUrl: resolved.url,
          durationSeconds: resolved.durationSeconds ?? null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message ?? 'Failed to save');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/app/library'), 1000);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Add music</h1>
      <p className="text-muted-foreground mb-8">Paste a YouTube link to save it to your library.</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">YouTube URL</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResolve} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="url">Link</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="url"
                  className="pl-10"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={resolving}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={resolving || !url.trim()}>
              {resolving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch metadata'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {resolved && (
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              {resolved.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolved.thumbnailUrl}
                  alt={resolved.title}
                  className="h-24 w-24 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted">
                  <Music className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{resolved.title}</h3>
                {resolved.artist && (
                  <p className="text-muted-foreground truncate">{resolved.artist}</p>
                )}
                {resolved.channelName && (
                  <p className="text-sm text-muted-foreground truncate">{resolved.channelName}</p>
                )}
                {resolved.durationSeconds && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {Math.floor(resolved.durationSeconds / 60)}:
                    {(resolved.durationSeconds % 60).toString().padStart(2, '0')}
                  </p>
                )}
              </div>
            </div>

            {success ? (
              <div className="mt-6 flex items-center gap-2 text-primary">
                <Bookmark className="h-5 w-5" />
                <p className="font-medium">Saved to your library!</p>
              </div>
            ) : (
              <div className="mt-6 flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-4 w-4" />
                      Save to library
                    </>
                  )}
                </Button>
                <Button variant="outline" disabled>
                  <Heart className="h-4 w-4" />
                  Favorite
                </Button>
                <Button variant="outline" disabled>
                  <ListPlus className="h-4 w-4" />
                  Add to playlist
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
