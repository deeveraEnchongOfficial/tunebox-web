import { headers } from 'next/headers';

import { auth } from '@/lib/auth';

/** Get the current session's user, or null if unauthenticated. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** Throw if unauthenticated. Returns the user. */
export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    const { AppError } = await import('@/lib/errors/AppError');
    const { ErrorCode } = await import('@/lib/errors/codes');
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: 'You must be logged in.' });
  }
  return user;
}
