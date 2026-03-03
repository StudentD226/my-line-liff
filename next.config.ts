import type { NextConfig } from "next";

const nextConfig = {
  images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'profile.line-scdn.net',
    },
  ],
},
}

export default nextConfig;
