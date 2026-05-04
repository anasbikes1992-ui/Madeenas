import type { NextConfig } from "next";
// @ts-ignore
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  async headers() {
    const commonHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];

    if (process.env.NODE_ENV === 'production') {
      commonHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' });
    }

    return [
      {
        source: '/:path*',
        headers: commonHeaders,
      },
    ];
  },

  // Allow only known external image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'madeenas.vercel.app',
      },
    ],
  },
  turbopack: {},
};

export default withPWA(nextConfig);
