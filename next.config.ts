import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  images: { localPatterns: [{ pathname: "/images/**", search: "" }] },
  devIndicators: false,
  outputFileTracingExcludes: {
    "/*": [
      "./.data/**/*",
      "./tmp/**/*",
      "./.env*",
      "./test-results/**/*",
      "./playwright-report/**/*",
      "./.next-admin-dev/**/*",
      "./.next-i18n-dev/**/*",
      "./.next-e2e/**/*",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/about", destination: "/agence", permanent: true },
      { source: "/services", destination: "/interventions", permanent: true },
      { source: "/treatments", destination: "/interventions", permanent: true },
      { source: "/doctors", destination: "/chirurgien", permanent: true },
      { source: "/appointment", destination: "/contact", permanent: true },
      {
        source: "/privacy",
        destination: "/informations-legales",
        permanent: true,
      },
    ];
  },
};
export default config;
