import { describe, it, expect } from "vitest";
import {
  getDefaultConfig,
  initMetrics,
  createObservabilityLogger,
  register,
  httpRequestCounter,
  httpRequestDuration,
  activeRequestsGauge,
  getObservabilitySnapshot,
} from "./core/index.js";

describe("Core Observability Module", () => {
  it("should generate default configuration", () => {
    const config = getDefaultConfig({ serviceName: "test-service" });
    expect(config.serviceName).toBe("test-service");
    expect(config.environment).toBeDefined();
    expect(config.enableTracing).toBe(true);
  });

  it("should initialize Prometheus metrics registry and default collectors", async () => {
    const metrics = initMetrics();
    expect(metrics.register).toBeDefined();
    expect(httpRequestCounter).toBeDefined();
    expect(httpRequestDuration).toBeDefined();
    expect(activeRequestsGauge).toBeDefined();

    httpRequestCounter.inc({ method: "GET", route: "/api/test", status_code: "200" });
    activeRequestsGauge.inc();
    activeRequestsGauge.dec();

    const output = await register.metrics();
    expect(output).toContain("http_requests_total");
    expect(output).toContain("http_active_requests");
  });

  it("should instantiate structured Winston logger", () => {
    const customLogger = createObservabilityLogger({ serviceName: "logger-test" });
    expect(customLogger).toBeDefined();
    expect(typeof customLogger.info).toBe("function");
    expect(typeof customLogger.error).toBe("function");
  });

  it("should produce a valid ObservabilitySnapshot for UI consumption", async () => {
    httpRequestCounter.inc({ method: "POST", route: "/api/login", status_code: "200" });
    httpRequestDuration.observe({ method: "POST", route: "/api/login", status_code: "200" }, 0.125);

    const snapshot = await getObservabilitySnapshot({ serviceName: "snapshot-test" });
    expect(snapshot).toBeDefined();
    expect(snapshot.service.name).toBe("snapshot-test");
    expect(snapshot.summary.totalRequests).toBeGreaterThan(0);
    expect(snapshot.http.topEndpoints).toBeInstanceOf(Array);
    expect(snapshot.runtime.cpuPercent).toBeGreaterThanOrEqual(0);
    expect(snapshot.runtime.memoryRssMb).toBeGreaterThan(0);
  });

  it("should record request events and calculate sliding time windows", async () => {
    const { recordRequestEvent, getWindowMetrics } = await import("./core/metrics.js");
    const now = Date.now();
    recordRequestEvent({
      timestamp: now,
      statusCode: 200,
      route: "/api/items",
      method: "GET",
      durationMs: 20,
    });
    recordRequestEvent({
      timestamp: now,
      statusCode: 500,
      route: "/api/items",
      method: "POST",
      durationMs: 50,
    });

    const window5m = getWindowMetrics(5 * 60 * 1000);
    expect(window5m.totalRequests).toBeGreaterThanOrEqual(2);
    expect(window5m.errorRequests).toBeGreaterThanOrEqual(1);
    expect(window5m.errorRate).toBeGreaterThan(0);
  });

  it("should record event breadcrumbs and retrieve them", async () => {
    const { addBreadcrumb, getBreadcrumbs } = await import("./core/logger.js");
    addBreadcrumb({ category: "auth", message: "User session valid", level: "info" });
    addBreadcrumb({ category: "db", message: "SELECT * FROM orders", level: "info" });

    const crumbs = getBreadcrumbs();
    expect(crumbs.length).toBeGreaterThanOrEqual(2);
    expect(crumbs[crumbs.length - 1].message).toBe("SELECT * FROM orders");
  });

  it("should compute deterministic fingerprints and aggregate recurring issues", async () => {
    const { computeFingerprint, recordError, getRecentErrors } = await import("./core/logger.js");
    const fp1 = computeFingerprint({
      message: "Timeout error on port 3000",
      route: "/api/test",
      statusCode: 500,
    });
    const fp2 = computeFingerprint({
      message: "Timeout error on port 3001",
      route: "/api/test",
      statusCode: 500,
    });
    expect(fp1).toBe(fp2);

    recordError({
      message: "DB connection lost",
      route: "/api/db",
      statusCode: 500,
    });
    recordError({
      message: "DB connection lost",
      route: "/api/db",
      statusCode: 500,
    });

    const recent = getRecentErrors();
    const found = recent.find((e) => e.route === "/api/db");
    expect(found).toBeDefined();
    expect(found?.occurrences).toBeGreaterThanOrEqual(2);
  });

  it("should redact sensitive authorization and cookie headers", async () => {
    const { sanitizeHeaders } = await import("./core/logger.js");
    const rawHeaders = {
      authorization: "Bearer secret_token_123",
      cookie: "session_id=abc456",
      "x-api-key": "key_xyz",
      "user-agent": "Mozilla/5.0",
      host: "localhost:5000",
    };

    const sanitized = sanitizeHeaders(rawHeaders);
    expect(sanitized.authorization).toBe("[REDACTED]");
    expect(sanitized.cookie).toBe("[REDACTED]");
    expect(sanitized["x-api-key"]).toBe("[REDACTED]");
    expect(sanitized["user-agent"]).toBe("Mozilla/5.0");
    expect(sanitized.host).toBe("localhost:5000");
  });
});
