import { createAuthClient } from 'better-auth/react';

// No baseURL default: better-auth falls back to the page's own origin,
// which is always correct in production. NEXT_PUBLIC_APP_URL only needs
// to be set when the API lives on a different origin than the page.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || undefined,
});

export const { signIn, signUp, signOut, useSession } = authClient;
