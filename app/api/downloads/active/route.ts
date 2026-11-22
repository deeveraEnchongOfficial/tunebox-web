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
      where: { userId: user.id, status: { in: ['PENDING', 'PROCESSING', 'FAILED'] } },
      orderBy: { createdAt: 'desc' },
      include: { music: { select: { title: true } } },
    });
    // Keep only the newest row per music — retries create new rows.
    const seen = new Set<string>();
    const items = downloads
      .filter((d) => (seen.has(d.musicId) ? false : (seen.add(d.musicId), true)))
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
