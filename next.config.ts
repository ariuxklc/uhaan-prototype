import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Geolocation is only used by the "nearest city" button, and only on this origin.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // A package-lock.json higher up the file system would otherwise be taken as the workspace root.
  turbopack: { root: process.cwd() },
  // IQAir authenticates with a query parameter; never print full request URLs.
  logging: { fetches: { fullUrl: false } },
  // School monitor CSVs are read from disk at request time (lib/monitors/csv-source.ts),
  // so serverless deploys must ship them with every page and route that shows them.
  outputFileTracingIncludes: {
    "/\\[lang\\]": ["./monitor-data/**/*.csv"],
    "/api/data/**": ["./monitor-data/**/*.csv"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
