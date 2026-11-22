import { handleError, ok } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

// Latest download per track that needs attention — in-flight (progress bar)
// or failed (retry). Feeds the floating download widget.
export async function GET() {
  try {
    const user = await requireAuth();
    const downloads = await prisma.download.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { music: { select: { title: true } } },
    });
    // Dedup by newest row per music across ALL statuses first — a track
    // whose latest attempt was dismissed (DELETED) or finished (READY)
    // must not resurface its older failed rows.
    const seen = new Set<string>();
    const items = downloads
      .filter((d) => (seen.has(d.musicId) ? false : (seen.add(d.musicId), true)))
      .filter((d) => ['PENDING', 'PROCESSING', 'FAILED'].includes(d.status))
      .map((d) => ({
        id: d.id,
        musicId: d.musicId,
        title: d.music.title,
        status: d.status,
        progress: d.progress ?? 0,
        error: d.error,
      }));
    return ok(items);
  } catch (error) {
    return handleError(error);
  }
}
