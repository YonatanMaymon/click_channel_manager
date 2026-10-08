// Sentry for the worker. Imported near the top of ./index.ts so it is running
// before any job starts.
import * as Sentry from "@sentry/node";

import { sentryOptions } from "@/lib/sentry-options";
import type { JobFailure } from "./jobs/report-final-failure";

Sentry.init(sentryOptions("worker"));

// Sends a job's final failure to Sentry, tagged with its queue so failures can
// be filtered by job type. The job's data is left out: it can hold guests'
// personal details.
export function reportJobFailure(error: unknown, failure: JobFailure) {
  Sentry.captureException(error, {
    tags: { queue: failure.queue },
    contexts: { job: { id: failure.jobId, attempts: failure.attempts } },
  });
}
