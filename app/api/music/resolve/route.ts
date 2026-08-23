import { z } from 'zod';

import { handleError, ok } from '@/lib/api-response';
import { musicService } from '@/lib/services/music-service';

const resolveSchema = z.object({ url: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = resolveSchema.parse(body);
    const data = await musicService.resolve(url);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}
