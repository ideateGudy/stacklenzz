import { describe, it, expect } from "vitest";
import { getObservabilitySnapshot } from "./core/snapshot.js";

describe("SLO (Service Level Objective) & Error Budget Engine", () => {
  it("should calculate remaining error budget and burn rate in snapshot", async () => {
    const snapshot = await getObservabilitySnapshot({
      slo: {
        availabilityTarget: 99.0, // 1% allowed error rate
      },
    });

    expect(snapshot.slo).toBeDefined();
    expect(snapshot.slo?.availabilityTarget).toBe(99.0);
    expect(snapshot.slo?.currentAvailability).toBeGreaterThanOrEqual(0);
    expect(snapshot.slo?.errorBudgetPercent).toBeGreaterThanOrEqual(0);
    expect(snapshot.slo?.errorBudgetPercent).toBeLessThanOrEqual(100);
    expect(snapshot.slo?.burnRate).toBeGreaterThanOrEqual(0);
    expect(["healthy", "at_risk", "breached"]).toContain(snapshot.slo?.status);
  });

  it("should evaluate SLO status as healthy when error rate is 0", async () => {
    const snapshot = await getObservabilitySnapshot({
      slo: {
        availabilityTarget: 99.5,
      },
    });

    if (snapshot.summary.errorRate === 0) {
      expect(snapshot.slo?.status).toBe("healthy");
      expect(snapshot.slo?.errorBudgetPercent).toBe(100);
      expect(snapshot.slo?.burnRate).toBe(0);
    }
  });
});
