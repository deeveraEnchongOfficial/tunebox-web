import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['ffmpeg-static', '@googleapis/drive'],
  outputFileTracingIncludes: {
    '/api/music/[id]/download': [
      './bin/yt-dlp',
      './node_modules/ffmpeg-static/**',
    ],
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
