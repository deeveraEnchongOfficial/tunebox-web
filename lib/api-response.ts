import { AppError } from './errors/AppError';

/** Standard success envelope. */
export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ success: true, data }, init);
}

/** Convert any thrown value into the standard error envelope. */
export function handleError(error: unknown): Response {
  if (error instanceof AppError) {
    return error.toResponse();
  }
  // Never leak internal stack traces to clients.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[unhandled]', error);
  }
  return Response.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
    { status: 500 },
  );
}
