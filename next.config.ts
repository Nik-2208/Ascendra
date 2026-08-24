import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import path from "path";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ['192.168.0.103'],
  
  // Prevent bundling server-only native modules — they must stay as external
  // This dramatically reduces compilation time for server components
  serverExternalPackages: ["@prisma/client", "pg", "@prisma/adapter-pg", "bcryptjs"],
  
  experimental: {
    // Tree-shake lucide-react and recharts for faster client bundle
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion", "date-fns"],
    instantNavigationDevToolsToggle: true,
  },
  
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          }
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
