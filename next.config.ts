import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@googleapis/drive'],
  // bin/ holds real (non-symlinked) yt-dlp + ffmpeg binaries staged by
  // scripts/fetch-ytdlp.mjs — tracing symlinked node_modules dirs makes
  // Vercel reject the function package.
  outputFileTracingIncludes: {
    '/api/music/[id]/download': ['./bin/**'],
  },
  // Allow the mobile app to call the API during development.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
