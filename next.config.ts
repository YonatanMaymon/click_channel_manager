import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {};

const withNextIntl = createNextIntlPlugin({
  experimental: {
    // Generates messages/he.d.json.ts so {placeholders} in messages are type-checked
    createMessagesDeclaration: "./messages/he.json",
  },
});

// Uploads source maps to Sentry during `next build`, so browser errors point
// at our real code instead of minified bundles. Needs SENTRY_ORG,
// SENTRY_PROJECT and SENTRY_AUTH_TOKEN (set on Railway); without them, as on
// your computer, the build skips the upload.
export default withSentryConfig(withNextIntl(nextConfig), {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    // Sentry keeps a copy; don't also serve our source code to every visitor
    deleteSourcemapsAfterUpload: true,
  },
  silent: !process.env.CI,
});
