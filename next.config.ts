import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/meet-addon/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://*.meet.google.com https://meet.google.com 'self'",
          },
          {
            key: "Permissions-Policy",
            value: "display-capture=*",
          },
        ],
      },
      // Security headers for all routes
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options",   value: "nosniff" },
          { key: "X-Frame-Options",          value: "SAMEORIGIN" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  // Removed: typescript: { ignoreBuildErrors: true }
  // All TS errors must be fixed explicitly — this was hiding real bugs.
  images: {
    // Allow Next.js image optimization for external sources if needed
    remotePatterns: [],
  },
  // Compress responses
  compress: true,
};

export default nextConfig;
