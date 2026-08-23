import { handleError, ok } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/session';
import { musicService } from '@/lib/services/music-service';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  artist: z.string().nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const music = await musicService.getById(id, user.id);
    return ok(music);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);
    const music = await musicService.update(id, user.id, data);
    return ok(music);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await musicService.delete(id, user.id);
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
