import { Readable } from 'node:stream';

import { handleError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/session';
import { downloadService } from '@/lib/services/download-service';
import { driveService } from '@/lib/services/drive-service';

export const runtime = 'nodejs';

const PASSTHROUGH_HEADERS = ['content-length', 'content-range'] as const;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { fileId } = await downloadService.streamTarget(user.id, id);
    const res = await driveService.openReadStream(
      fileId,
      request.headers.get('range') ?? undefined,
    );

    const headers = new Headers({
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store',
    });
    for (const key of PASSTHROUGH_HEADERS) {
      const value = res.headers[key];
      if (value) headers.set(key, value);
    }

    return new Response(Readable.toWeb(res.stream) as ReadableStream, {
      status: res.status === 206 ? 206 : 200,
      headers,
    });
  } catch (error) {
    return handleError(error);
  }
}
