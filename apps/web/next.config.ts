import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@project-tracker/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:3001'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
