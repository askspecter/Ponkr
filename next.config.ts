import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack: (config) => {
    // Optional peer deps pulled in by wallet connectors (x402 payments, pretty logging) that we don't use.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core/client": false,
      "@x402/evm": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/svm/exact/client": false,
      "@stripe/stripe-js": false,
      "@react-native-async-storage/async-storage": false,
      "@farcaster/mini-app-solana": false,
    };
    config.externals = [...(Array.isArray(config.externals) ? config.externals : []), "pino-pretty", "lokijs", "encoding"];
    return config;
  },
};

export default nextConfig;
