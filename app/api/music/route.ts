import { z } from 'zod';

import { handleError, ok } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/session';
import { musicService } from '@/lib/services/music-service';

const createSchema = z.object({
  sourceType: z.enum(['YOUTUBE', 'AUTHORIZED_AUDIO']),
  sourceId: z.string().min(1),
  sourceUrl: z.string().url(),
  title: z.string().min(1),
  artist: z.string().nullable().optional(),
  channelName: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  durationSeconds: z.number().int().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = createSchema.parse(body);
    const music = await musicService.create(user.id, data);
    return ok(music, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined;

    const result = await musicService.list(user.id, { cursor, limit });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
