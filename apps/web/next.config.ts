import type { NextConfig } from 'next';

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
};

export default nextConfig;
