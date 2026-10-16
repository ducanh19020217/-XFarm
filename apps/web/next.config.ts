import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@xfarm/ui', '@xfarm/shared'],
};

export default nextConfig;
