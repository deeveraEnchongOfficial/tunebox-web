import { handleError, ok } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/session';
import { favoriteService } from '@/lib/services/favorite-service';

export async function GET() {
  try {
    const user = await requireAuth();
    const favorites = await favoriteService.list(user.id);
    return ok(favorites);
  } catch (error) {
    return handleError(error);
  }
}
