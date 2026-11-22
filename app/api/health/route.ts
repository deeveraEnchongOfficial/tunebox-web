import { ok } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  return ok({
    status: 'ok',
    service: 'tunebox-web',
    time: new Date().toISOString(),
    trustedOrigins: 'dynamic-v2',
    // Deployment diagnostics — booleans only, never values.
    cookiesConfigured: Boolean(process.env.YOUTUBE_COOKIES),
  });
}
