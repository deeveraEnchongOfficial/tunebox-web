/**
 * Parse a YouTube URL and return the video ID when the URL is a supported
 * watch / share / shorts / youtu.be form. Returns null for unsupported URLs.
 *
 * This validates the *form* of the URL only — it does NOT authorize any
 * download or extraction. YouTube URLs are treated as bookmarks/references.
 */
export function parseYouTubeVideoId(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!url) return null;

  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id && isYouTubeId(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v');
        return id && isYouTubeId(id) ? id : null;
      }
      const parts = u.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'shorts' || parts[0] === 'embed') && parts[1]) {
        return isYouTubeId(parts[1]) ? parts[1] : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function isYouTubeUrl(raw: string): boolean {
  return parseYouTubeVideoId(raw) !== null;
}

function isYouTubeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}
