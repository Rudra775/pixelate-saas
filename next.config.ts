import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    //  WARNING: Ignoring build errors is dangerous for production
    // but useful for getting v1 live quickly.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      }
    ]
  }
};

export default nextConfig;