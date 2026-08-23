import { z } from 'zod';

import { handleError, ok } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/session';
import { playlistService } from '@/lib/services/playlist-service';

const addItemSchema = z.object({ musicId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { musicId } = addItemSchema.parse(body);
    const item = await playlistService.addItem(id, user.id, musicId);
    return ok(item, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
