import { describe, it, expect } from "vitest";
import express from "express";
import { setupObservability, createMetricsHandler, createStatsHandler } from "./express/index.js";
import { register } from "./core/index.js";

describe("Express Observability Setup", () => {
  it("should attach middleware and metrics endpoint to Express app", async () => {
    const app = express();

    setupObservability(app, {
      autoInitTracing: false, // Don't start OTel exporter during unit test
      metricsPath: "/metrics",
      statsPath: "/api/observability/stats",
    });

    const metricsHandler = createMetricsHandler();
    expect(typeof metricsHandler).toBe("function");

    const statsHandler = createStatsHandler();
    expect(typeof statsHandler).toBe("function");

    const metrics = await register.metrics();
    expect(metrics).toBeDefined();
  });

  it("should record 200, 404 and 500 status in Express request cycle", async () => {
    const app = express();
    setupObservability(app, {
      autoInitTracing: false,
    });

    app.get("/api/ok", (_req, res) => res.json({ ok: true }));
    app.get("/api/err", (_req, res) => res.status(500).json({ error: "fail" }));
    app.use((req, res) => res.status(404).json({ error: "Not Found" }));

    const server = app.listen(0);
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    await fetch(`${baseUrl}/api/ok`);
    await fetch(`${baseUrl}/api/err`);
    await fetch(`${baseUrl}/api/missing`);

    const statsRes = await fetch(`${baseUrl}/api/observability/stats`);
    const stats = (await statsRes.json()) as any;
    expect(stats.summary.totalRequests).toBeGreaterThanOrEqual(3);
    expect(stats.http.statusBreakdown.status2xx).toBeGreaterThanOrEqual(1);
    expect(stats.http.statusBreakdown.status4xx).toBeGreaterThanOrEqual(1);
    expect(stats.http.statusBreakdown.status5xx).toBeGreaterThanOrEqual(1);

    server.close();
  });
});
