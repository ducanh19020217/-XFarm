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

const isDemo = process.env.NEXT_PUBLIC_DEMO === '1';

const nextConfig: NextConfig = {
  transpilePackages: ['@xfarm/ui', '@xfarm/shared'],
  output: isDemo ? 'export' : undefined,
  basePath: isDemo ? process.env.DEMO_BASE_PATH || '/-XFarm' : undefined,
  images: isDemo
    ? { unoptimized: true }
    : {
        dangerouslyAllowSVG: true,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
    DEMO_BASE_PATH: process.env.DEMO_BASE_PATH || '/-XFarm',
    NEXT_PUBLIC_BASE_PATH: process.env.DEMO_BASE_PATH || '/-XFarm',
  },
  ...(isDemo
    ? {}
    : {
        async rewrites() {
          const publicUrl = process.env.NEXT_PUBLIC_API_URL;
          const apiUrl =
            process.env.API_INTERNAL_URL ||
            (publicUrl && /^https?:\/\//.test(publicUrl) ? publicUrl : undefined) ||
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
      }),
};

export default isDemo ? nextConfig : withSerwist(nextConfig);
