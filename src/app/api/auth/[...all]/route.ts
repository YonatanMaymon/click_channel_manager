// Every Better Auth request (/api/auth/...) goes through here. Our own
// screens call Better Auth from server actions instead (src/app/login), but
// Better Auth's browser code and session checks use these addresses.
import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler((request: Request) =>
  getAuth().handler(request),
);
