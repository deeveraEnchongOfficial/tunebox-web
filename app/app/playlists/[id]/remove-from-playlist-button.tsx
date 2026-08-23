'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function RemoveFromPlaylistButton({
  playlistId,
  musicId,
}: {
  playlistId: string;
  musicId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    try {
      await fetch(`/api/playlists/${playlistId}/items/${musicId}`, { method: 'DELETE' });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleRemove}
      disabled={loading}
      className="opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4 text-destructive" />
      )}
    </Button>
  );
}
