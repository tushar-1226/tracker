import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Swiss Ephemeris is a native addon: load it from node_modules instead of bundling it,
  // and ship the ephemeris data files and the native binary with every server function
  // (the binary is loaded dynamically, so file tracing can't see it).
  serverExternalPackages: ["sweph"],
  outputFileTracingIncludes: { "/**": ["./ephe/**", "./node_modules/sweph/prebuilds/linux-x64/**", "./node_modules/sweph/package.json"] },
};

export default nextConfig;
