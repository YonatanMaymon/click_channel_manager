import type { JobWithMetadata } from "pg-boss";

export type JobFailure = { queue: string; jobId: string; attempts: number };
type Report = (error: unknown, failure: JobFailure) => void;

// pg-boss catches every error a job throws, marks the job failed and retries
// it later, so the worker never crashes and nothing would reach Sentry on its
// own. This wraps a job handler so a failure is reported, but only on the last
// attempt: one failed try is often a one-off (a portal that didn't answer),
// and only a job that keeps failing needs a person to look at it.
//
// The handler needs `includeMetadata: true` in boss.work(), which adds
// retryLimit to each job.
export function reportFinalFailure<T>(
  queue: string,
  handler: (job: JobWithMetadata<T>) => Promise<void>,
  report: Report,
) {
  return async (jobs: JobWithMetadata<T>[]) => {
    for (const job of jobs) {
      try {
        await handler(job);
      } catch (error) {
        // retryCount is 0 on the first attempt and reaches retryLimit on the last
        if (job.retryCount >= job.retryLimit) {
          try {
            report(error, {
              queue,
              jobId: job.id,
              attempts: job.retryCount + 1,
            });
          } catch (reportError) {
            // Reporting must never hide the job's own error from pg-boss
            console.error(
              "[worker] failed to report job failure:",
              reportError,
            );
          }
        }
        // Rethrow so pg-boss still marks the job failed (and retries it if it can)
        throw error;
      }
    }
  };
}
