import type { NextConfig } from "next";
import path from "path";
import { execSync } from "child_process";

const gitHash = (() => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return Date.now().toString();
  }
})();

const nextConfig: NextConfig = {
  generateBuildId: async () => gitHash,
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
      // Never cache HTML pages — browser must always fetch fresh HTML after deploy
      {
        source: "/:path((?!_next/static|_next/image|favicon\\.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
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
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",            value: "SAMEORIGIN" },
          { key: "X-XSS-Protection",           value: "1; mode=block" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=(), payment=(self), usb=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Razorpay checkout + Google analytics/tag manager
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com https://*.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
              "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
              "frame-ancestors 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://api.razorpay.com",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
