import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: false,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  transpilePackages: ['@xfarm/ui', '@xfarm/shared'],
};

export default withSerwist(nextConfig);
