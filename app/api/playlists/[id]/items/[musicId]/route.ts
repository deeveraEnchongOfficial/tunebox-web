import { handleError, ok } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/session';
import { playlistService } from '@/lib/services/playlist-service';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; musicId: string }> },
) {
  try {
    const user = await requireAuth();
    const { id, musicId } = await params;
    await playlistService.removeItem(id, user.id, musicId);
    return ok({ removed: true });
  } catch (error) {
    return handleError(error);
  }
}
