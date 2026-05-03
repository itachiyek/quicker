import type { NextConfig } from "next";

const ONE_YEAR = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  // Long-lived browser caching for static assets that almost never change.
  // Without this, every visit re-requests these from the edge — at thousands
  // of hits/day they dominate the Vercel edge-request bill.
  async headers() {
    const immutable = `public, max-age=${ONE_YEAR}, immutable`;
    return [
      {
        source: "/icon.svg",
        headers: [{ key: "Cache-Control", value: immutable }],
      },
      {
        source: "/apple-icon.svg",
        headers: [{ key: "Cache-Control", value: immutable }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: `public, max-age=${ONE_YEAR}` },
        ],
      },
      {
        // PWA / app icons in /public — versioned only by deploy.
        source: "/:path*.svg",
        headers: [{ key: "Cache-Control", value: immutable }],
      },
    ];
  },
};

export default nextConfig;
