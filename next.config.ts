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
  // Emit a self-contained server bundle — required for the Docker image
  output: "standalone",
  // Fix the workspace root detection warning from multiple lockfiles
  outputFileTracingRoot: path.join(__dirname),
  // @cyberlib/shared ships TS source (no build step) — Next.js must
  // transpile it itself rather than treating it as pre-built node_modules code
  transpilePackages: ["@cyberlib/shared"],

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
    // Allowlist only domains actually used — prevents SSRF via the image optimizer.
    // To add a new domain: add an entry here, not a wildcard.
    remotePatterns: [
      // Google OAuth profile pictures
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      // YouTube thumbnails (study room / blog embeds)
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      // WhatsApp / Meta CDN (profile images from WhatsApp Business API)
      { protocol: "https", hostname: "*.fbcdn.net" },
      // Self-hosted / DO Spaces (if used for uploads)
      { protocol: "https", hostname: "*.digitaloceanspaces.com" },
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
      // Security headers for all routes
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",            value: "DENY" },
          // X-XSS-Protection intentionally omitted — deprecated in modern browsers,
          // harmful in IE (mode=block is exploitable), and CSP provides better coverage.
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=(), payment=(self), usb=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Razorpay checkout + Google analytics/tag manager + YouTube IFrame API
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com https://*.googletagmanager.com https://www.youtube.com https://s.ytimg.com",
              // Blocks inline event handlers (onclick=, onerror=, etc.) even while unsafe-inline
              // is needed for GTM/Razorpay — partial XSS hardening without breaking third parties.
              "script-src-attr 'none'",
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
      // Google Meet Add-on: overrides global headers so the panel can be embedded
      // inside Google Meet. CSP frame-ancestors handles the allow-list; X-Frame-Options
      // is explicitly removed for this route because it has no valid value that permits
      // a third-party origin (ALLOWALL is non-standard and ignored by browsers).
      // Modern browsers use CSP frame-ancestors and ignore X-Frame-Options when both
      // are present — so CSP alone is sufficient and correct here.
      {
        source: "/meet-addon/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://www.youtube.com https://s.ytimg.com https://*.googlevideo.com",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
              // frame-ancestors permits Google Meet to embed this panel — no X-Frame-Options needed
              "frame-ancestors https://*.meet.google.com https://meet.google.com 'self'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
          // X-Frame-Options intentionally omitted: CSP frame-ancestors supersedes it
          // in all modern browsers, and there is no X-Frame-Options value that allows
          // a specific third-party origin without opening clickjacking to all origins.
          {
            key: "Permissions-Policy",
            value: "display-capture=*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
