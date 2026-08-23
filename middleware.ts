import { NextResponse } from 'next/server';

const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'https://tunebox-web-chi.vercel.app',
];

export function middleware(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  const isAllowed =
    allowedOrigins.includes(origin) || origin.startsWith('http://localhost:');

  // Handle preflight OPTIONS
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', isAllowed ? origin : allowedOrigins[0]);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', isAllowed ? origin : allowedOrigins[0]);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
