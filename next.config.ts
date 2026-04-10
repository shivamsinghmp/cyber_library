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
    ];
  },
};

export default nextConfig;
