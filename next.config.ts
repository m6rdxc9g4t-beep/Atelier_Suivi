import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
      // Préférence de thème commune de la suite : posée en ligne dans <head> (src/components/theme/theme-script.tsx)
      "atelier-theme.js": { type: "text" },
    },
  },
  async redirects() {
    return [{ source: "/", destination: "/aujourdhui", permanent: false }];
  },
};

export default nextConfig;
