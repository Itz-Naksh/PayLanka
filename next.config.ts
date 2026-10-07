import type { NextConfig } from "next";

// Cache Components is intentionally left OFF. Every PayLanka page is behind a
// login and shows live payroll data, so classic per-request rendering is the
// simpler and safer model (no risk of serving a stale payroll figure).
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
