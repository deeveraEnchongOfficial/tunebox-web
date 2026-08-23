import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';

import { prisma } from '@/lib/db';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'mongodb',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [nextCookies()],
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  trustedOrigins: async (request) => {
    const base = [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://tunebox-web-chi.vercel.app',
    ];
    if (!request) return base;
    const origin = request.headers.get('origin') ?? '';
    // Trust any localhost origin (for Flutter web dev on any port)
    if (origin.startsWith('http://localhost:')) {
      return [...base, origin];
    }
    return base;
  },
});

export type Session = typeof auth.$Infer.Session;
