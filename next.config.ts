import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Swiss Ephemeris is a native addon: load it from node_modules instead of bundling it,
  // and ship the ephemeris data files with every server function.
  serverExternalPackages: ["sweph"],
  outputFileTracingIncludes: { "/**": ["./ephe/**"] },
};

export default nextConfig;
