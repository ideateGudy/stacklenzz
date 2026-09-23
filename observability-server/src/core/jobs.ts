export interface JobRecord {
  id: string;
  name: string;
  queue?: string;
  status: "completed" | "failed" | "running";
  durationMs?: number;
  startTime: number;
  endTime?: number;
  error?: string;
  attempts?: number;
}

export interface JobMetricsSummary {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  failureRate: number;
  avgDurationMs: number;
  recentJobs: JobRecord[];
}

const jobHistory: JobRecord[] = [];
const activeJobsMap = new Map<string, JobRecord>();
const MAX_JOB_HISTORY = 50;

/**
 * Tracks the execution of a background task, cron job, or queue worker function.
 *
 * Example:
 * ```ts
 * await trackJob("generate-daily-report", async () => {
 *   await runReport();
 * }, { queue: "reports" });
 * ```
 */
export async function trackJob<T>(
  name: string,
  fn: () => Promise<T> | T,
  options?: { queue?: string; id?: string }
): Promise<T> {
  const id = options?.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();
  const record: JobRecord = {
    id,
    name,
    queue: options?.queue || "default",
    status: "running",
    startTime,
  };

  activeJobsMap.set(id, record);

  try {
    const result = await fn();
    const endTime = Date.now();
    record.status = "completed";
    record.endTime = endTime;
    record.durationMs = parseFloat((endTime - startTime).toFixed(1));
    activeJobsMap.delete(id);
    jobHistory.unshift(record);
    if (jobHistory.length > MAX_JOB_HISTORY) jobHistory.pop();
    return result;
  } catch (err: any) {
    const endTime = Date.now();
    record.status = "failed";
    record.endTime = endTime;
    record.durationMs = parseFloat((endTime - startTime).toFixed(1));
    record.error = err?.message || String(err);
    activeJobsMap.delete(id);
    jobHistory.unshift(record);
    if (jobHistory.length > MAX_JOB_HISTORY) jobHistory.pop();
    throw err;
  }
}

/**
 * Gets aggregated metrics on background jobs.
 */
export function getJobMetrics(): JobMetricsSummary {
  const activeJobs = activeJobsMap.size;
  const completedJobs = jobHistory.filter((j) => j.status === "completed").length;
  const failedJobs = jobHistory.filter((j) => j.status === "failed").length;
  const totalJobs = jobHistory.length + activeJobs;

  const failureRate =
    totalJobs > 0
      ? parseFloat(((failedJobs / (completedJobs + failedJobs || 1)) * 100).toFixed(2))
      : 0;

  const finishedWithDuration = jobHistory.filter((j) => typeof j.durationMs === "number");
  const avgDurationMs =
    finishedWithDuration.length > 0
      ? parseFloat(
          (
            finishedWithDuration.reduce((acc, curr) => acc + (curr.durationMs || 0), 0) /
            finishedWithDuration.length
          ).toFixed(1)
        )
      : 0;

  return {
    totalJobs,
    activeJobs,
    completedJobs,
    failedJobs,
    failureRate,
    avgDurationMs,
    recentJobs: [...Array.from(activeJobsMap.values()), ...jobHistory.slice(0, 15)],
  };
}
