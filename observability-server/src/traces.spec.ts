import { describe, it, expect } from "vitest";
import { TraceContext, recordTrace, getRecentTraces } from "./core/traces.js";

describe("Distributed Trace Waterfall & Span Collector", () => {
  it("should record traces and build execution tree spans with timing", () => {
    const trace = new TraceContext("GET /api/checkout", "GET", "/api/checkout");
    trace.addSpan("AuthGuard", "guard", 3.5, "ok");
    trace.addSpan("OrdersService.create", "controller", 25.0, "ok");
    trace.addSpan("PostgreSQL INSERT", "database", 12.0, "ok");
    const completed = trace.end(200, "ok");

    expect(completed.spans.length).toBe(3);
    expect(completed.durationMs).toBeGreaterThanOrEqual(0);
    expect(completed.status).toBe("ok");
    expect(completed.traceId).toBeDefined();

    const recent = getRecentTraces(10);
    expect(recent.some((t) => t.traceId === completed.traceId)).toBe(true);
  });

  it("should support span error statuses and custom attributes", () => {
    const trace = new TraceContext("POST /api/pay", "POST", "/api/pay");
    trace.addSpan("StripeClient", "external", 150.0, "error", {
      reason: "Card declined",
      code: "insufficient_funds",
    });
    const completed = trace.end(500, "error");

    expect(completed.status).toBe("error");
    expect(completed.spans[0].status).toBe("error");
    expect(completed.spans[0].attributes?.reason).toBe("Card declined");
  });
});
