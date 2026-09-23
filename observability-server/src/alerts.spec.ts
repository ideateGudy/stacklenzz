import { describe, it, expect, vi } from "vitest";
import { sendWebhookAlert, evaluateSnapshotAlerts, alertOnCrashLog } from "./core/alerts.js";

describe("Zero-Cost Webhook Alerting (Slack/Discord/Generic)", () => {
  it("should format and trigger Discord embed alert when SLA error rate threshold is breached", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const alertConfig = {
      webhookUrl: "https://discord.com/api/webhooks/123/xyz",
      errorRateThreshold: 2.0,
      cooldownMinutes: 0,
    };

    const mockSnapshot: any = {
      service: { name: "test-service", environment: "production" },
      summary: { totalRequests: 50, errorRate: 10.5, p95LatencyMs: 300 },
      runtime: { heapUsedMb: 50, heapTotalMb: 100 },
    };

    await evaluateSnapshotAlerts(mockSnapshot, alertConfig);

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe(alertConfig.webhookUrl);
    const parsedBody = JSON.parse(callArgs[1].body);
    expect(parsedBody.embeds[0].title).toContain("High Error Rate Alert");

    vi.unstubAllGlobals();
  });

  it("should format and trigger Slack alert when configured", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const alertConfig = {
      webhookUrl: "https://hooks.slack.com/services/T00/B00/X00",
      cooldownMinutes: 0,
    };

    await sendWebhookAlert(alertConfig, {
      title: "P95 Latency Spike",
      description: "Latency exceeded 1500ms",
      severity: "warning",
      service: "payment-api",
      environment: "production",
      timestamp: Date.now(),
    });

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const parsedBody = JSON.parse(callArgs[1].body);
    expect(parsedBody.text).toContain("Stacklenzz Observability");
    expect(parsedBody.attachments[0].blocks.length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });

  it("should trigger instant alert on 5xx crash log when alertOn5xxCrash is true", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const alertConfig = {
      webhookUrl: "https://discord.com/api/webhooks/123/xyz",
      alertOn5xxCrash: true,
      cooldownMinutes: 0,
    };

    await alertOnCrashLog(
      {
        id: "err-1",
        timestamp: Date.now(),
        message: "Database connection failed unexpectedly",
        statusCode: 500,
        route: "/api/orders",
        method: "POST",
      },
      alertConfig,
      { name: "order-service", environment: "production" }
    );

    expect(mockFetch).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
