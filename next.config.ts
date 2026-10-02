import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {};

const withNextIntl = createNextIntlPlugin({
  experimental: {
    // Generates messages/he.d.json.ts so {placeholders} in messages are type-checked
    createMessagesDeclaration: "./messages/he.json",
  },
});

export default withNextIntl(nextConfig);
