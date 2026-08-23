import { z } from 'zod';

import { handleError, ok } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/session';
import { playlistService } from '@/lib/services/playlist-service';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const user = await requireAuth();
    const playlists = await playlistService.list(user.id);
    return ok(playlists);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = createSchema.parse(body);
    const playlist = await playlistService.create(user.id, data);
    return ok(playlist, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
