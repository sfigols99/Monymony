import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-host friendly: emit a minimal standalone server (used by the Dockerfile).
  output: "standalone",
  webpack: (config) => {
    // tesseract.js pulls these only in Node; stub them out for the browser bundle.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
