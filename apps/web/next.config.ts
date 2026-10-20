import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';
import { loadEnvConfig } from '@next/env';
import path from 'node:path';

loadEnvConfig(path.resolve(__dirname, '../..'));

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: false,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  transpilePackages: ['@xfarm/ui', '@xfarm/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9010',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9010',
        pathname: '/**',
      },
    ],
  },
  env: {
    WEB_URL: process.env.WEB_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  async rewrites() {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.API_PORT
        ? `http://localhost:${process.env.API_PORT}/api/v1`
        : 'http://localhost:4100/api/v1');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default withSerwist(nextConfig);
