import { loadEnvConfig } from "@next/env";

// The worker runs outside Next.js, so load .env files with Next.js's own
// loader. Files load in this order, and the first to set a variable wins:
// .env.<mode>.local, .env.local, .env.<mode>, .env. The mode is "development"
// unless NODE_ENV is "production" or "test"; under "test", .env.local is
// skipped. Variables already set in the environment, as on Railway, win over
// every file.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
