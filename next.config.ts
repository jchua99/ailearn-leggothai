import type { NextConfig } from "next";

// Cache Components is off: every page depends on the logged-in user's cookie and live DB data,
// so all routes are rendered per request (the "previous" caching model).
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
