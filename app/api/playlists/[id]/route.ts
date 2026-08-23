import { z } from 'zod';

import { handleError, ok } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/session';
import { playlistService } from '@/lib/services/playlist-service';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const playlist = await playlistService.getById(id, user.id);
    return ok(playlist);
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
    const playlist = await playlistService.update(id, user.id, data);
    return ok(playlist);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await playlistService.delete(id, user.id);
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
