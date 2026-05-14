import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix the workspace root detection warning from multiple lockfiles
  outputFileTracingRoot: path.join(__dirname),

  // Remove X-Powered-By header (security + saves a few bytes)
  poweredByHeader: false,

  // Tree-shake heavy packages — only bundle icons/exports actually used
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "recharts",
      "@auth/prisma-adapter",
    ],
  },

  // Compress all responses
  compress: true,

  images: {
    // Serve WebP/AVIF for better compression
    formats: ["image/avif", "image/webp"],
    // Allow any HTTPS image (admin can configure remote logos)
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    // Cache optimized images for 7 days
    minimumCacheTTL: 604800,
    // Reasonable device sizes for the site's layout
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async headers() {
    return [
      // Cache public static files for 7 days
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|svg|gif|webp|avif|woff|woff2|ttf|otf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      // Google Meet addon CSP
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
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
