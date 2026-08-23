import { handleError, ok } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/session';
import { musicService } from '@/lib/services/music-service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    // Verify the music belongs to the user
    await musicService.getById(id, user.id);
    const { favoriteService } = await import('@/lib/services/favorite-service');
    const result = await favoriteService.toggle(user.id, id);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await musicService.getById(id, user.id);
    const { favoriteService } = await import('@/lib/services/favorite-service');
    await favoriteService.toggle(user.id, id);
    return ok({ favorited: false });
  } catch (error) {
    return handleError(error);
  }
}
