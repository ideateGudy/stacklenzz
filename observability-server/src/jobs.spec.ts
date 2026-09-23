import { describe, it, expect } from "vitest";
import { trackJob, getJobMetrics } from "./core/jobs.js";

describe("Background Jobs & Queue Worker Monitoring", () => {
  it("should record completed job runs and aggregate duration metrics", async () => {
    const result = await trackJob(
      "generate-invoices",
      async () => {
        return { generated: 15 };
      },
      { queue: "billing" }
    );

    expect(result.generated).toBe(15);

    const metrics = getJobMetrics();
    expect(metrics.totalJobs).toBeGreaterThanOrEqual(1);
    expect(metrics.completedJobs).toBeGreaterThanOrEqual(1);
    const job = metrics.recentJobs.find((j) => j.name === "generate-invoices");
    expect(job).toBeDefined();
    expect(job?.status).toBe("completed");
    expect(job?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("should capture failed jobs and track failure rate percentage", async () => {
    await expect(
      trackJob(
        "sync-remote-crm",
        async () => {
          throw new Error("API rate limit exceeded");
        },
        { queue: "crm" }
      )
    ).rejects.toThrow("API rate limit exceeded");

    const metrics = getJobMetrics();
    expect(metrics.failedJobs).toBeGreaterThanOrEqual(1);
    const failedJob = metrics.recentJobs.find((j) => j.name === "sync-remote-crm");
    expect(failedJob).toBeDefined();
    expect(failedJob?.status).toBe("failed");
    expect(failedJob?.error).toBe("API rate limit exceeded");
  });
});
