import { after } from 'next/server';

import { handleError, ok } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/session';
import { downloadService } from '@/lib/services/download-service';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { download, isNew } = await downloadService.request(user.id, id);
    if (isNew) {
      after(() => downloadService.process(download.id));
    }
    return ok(download, { status: isNew ? 201 : 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const download = await downloadService.latest(user.id, id);
    return ok(download);
  } catch (error) {
    return handleError(error);
  }
}
