import type { AlertConfig } from "./alert-types.js";
import type { ObservabilitySnapshot } from "./snapshot.js";
import type { CapturedErrorRecord } from "./logger.js";

interface AlertRecord {
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  service: string;
  environment: string;
  metric?: string;
  value?: string | number;
  threshold?: string | number;
  timestamp: number;
}

const alertHistory = new Map<string, number>();

function detectChannelType(url: string, explicit?: string): "slack" | "discord" | "generic" {
  if (explicit) return explicit as any;
  if (url.includes("discord.com/api/webhooks") || url.includes("discordapp.com/api/webhooks")) {
    return "discord";
  }
  if (url.includes("hooks.slack.com")) {
    return "slack";
  }
  return "generic";
}

/**
 * Dispatches an alert payload to Slack, Discord, or a generic HTTP webhook.
 * Zero external dependencies: uses native global `fetch`.
 */
export async function sendWebhookAlert(
  config: AlertConfig,
  alert: AlertRecord
): Promise<boolean> {
  const url = config.webhookUrl && !config.webhookUrl.includes("/mock/")
    ? config.webhookUrl
    : process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || config.webhookUrl;
  if (!url || url.includes("/mock/")) return false;

  const cooldownMs = (config.cooldownMinutes ?? 15) * 60 * 1000;
  const alertKey = `${alert.severity}:${alert.title}`;
  const lastSent = alertHistory.get(alertKey) || 0;
  const now = Date.now();

  // Allow zero cooldown (cooldownMinutes === 0) for immediate dev/test notifications
  if (cooldownMs > 0 && now - lastSent < cooldownMs) {
    // Suppressed by cooldown
    return false;
  }

  const channel = detectChannelType(url, config.channelType);

  let body: any;

  if (channel === "discord") {
    const color = alert.severity === "critical" ? 0xef4444 : alert.severity === "warning" ? 0xf59e0b : 0x3b82f6;
    body = {
      username: "Stacklenzz Observability",
      avatar_url: "https://stacklenzz.vercel.app/logo.png",
      embeds: [
        {
          title: `[${alert.severity.toUpperCase()}] ${alert.title}`,
          description: alert.description,
          color,
          fields: [
            { name: "Service", value: alert.service, inline: true },
            { name: "Environment", value: alert.environment, inline: true },
            ...(alert.metric ? [{ name: "Metric", value: String(alert.metric), inline: true }] : []),
            ...(alert.value ? [{ name: "Current Value", value: String(alert.value), inline: true }] : []),
            ...(alert.threshold ? [{ name: "Threshold", value: String(alert.threshold), inline: true }] : []),
          ],
          footer: { text: "Stacklenzz Alert System • Zero-cost Webhook" },
          timestamp: new Date(alert.timestamp).toISOString(),
        },
      ],
    };
  } else if (channel === "slack") {
    const isCritical = alert.severity === "critical";
    const color = isCritical ? "#ef4444" : alert.severity === "warning" ? "#f59e0b" : "#3b82f6";
    const emoji = isCritical ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️";

    body = {
      text: `${emoji} *[Stacklenzz Observability]* ${alert.title}`,
      attachments: [
        {
          color,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `${emoji} ${alert.title}`,
                emoji: true,
              },
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*Service:*\n\`${alert.service}\``,
                },
                {
                  type: "mrkdwn",
                  text: `*Environment:*\n\`${alert.environment}\``,
                },
                ...(alert.metric
                  ? [
                      {
                        type: "mrkdwn",
                        text: `*Metric / Status:*\n\`${alert.metric}\``,
                      },
                    ]
                  : []),
                ...(alert.value
                  ? [
                      {
                        type: "mrkdwn",
                        text: `*Current Value:*\n\`${alert.value}\``,
                      },
                    ]
                  : []),
              ],
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Error Details:*\n\`\`\`${alert.description}\`\`\``,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `⚡ *Stacklenzz Telemetry Engine* • <!date^${Math.floor(
                    alert.timestamp / 1000
                  )}^{date_num} {time_secs}|${new Date(alert.timestamp).toISOString()}>`,
                },
              ],
            },
          ],
        },
      ],
    };
  } else {
    // Generic JSON payload
    body = {
      source: "stacklenzz",
      alert,
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      alertHistory.set(alertKey, now);
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Stacklenzz Alerting] Failed to dispatch webhook:", err);
    return false;
  }
}

/**
 * Evaluates snapshot health against configured alert thresholds and sends alerts if needed.
 */
export async function evaluateSnapshotAlerts(
  snapshot: ObservabilitySnapshot,
  config?: AlertConfig
): Promise<void> {
  if (!config || !config.webhookUrl) return;

  const errorRateLimit = config.errorRateThreshold ?? 5;
  const p95Limit = config.p95LatencyThresholdMs ?? 1000;
  const heapUsageLimit = config.heapUsagePercentThreshold ?? 85;

  const currentErrorRate = snapshot.summary.errorRate;
  const currentP95 = snapshot.summary.p95LatencyMs;
  const heapUsed = snapshot.runtime.heapUsedMb;
  const heapTotal = snapshot.runtime.heapTotalMb;
  const heapUsagePct = heapTotal > 0 ? (heapUsed / heapTotal) * 100 : 0;

  // 1. Error rate alert
  if (snapshot.summary.totalRequests > 10 && currentErrorRate >= errorRateLimit) {
    await sendWebhookAlert(config, {
      title: `High Error Rate Alert on ${snapshot.service.name}`,
      description: `Current 5xx server error rate is ${currentErrorRate}%, exceeding SLA threshold of ${errorRateLimit}%.`,
      severity: "critical",
      service: snapshot.service.name,
      environment: snapshot.service.environment,
      metric: "5xx Error Rate",
      value: `${currentErrorRate}%`,
      threshold: `${errorRateLimit}%`,
      timestamp: Date.now(),
    });
  }

  // 2. High Latency P95 alert
  if (snapshot.summary.totalRequests > 10 && currentP95 >= p95Limit) {
    await sendWebhookAlert(config, {
      title: `High P95 Latency Degradation on ${snapshot.service.name}`,
      description: `P95 response latency reached ${currentP95}ms, surpassing threshold of ${p95Limit}ms.`,
      severity: "warning",
      service: snapshot.service.name,
      environment: snapshot.service.environment,
      metric: "P95 Latency",
      value: `${currentP95}ms`,
      threshold: `${p95Limit}ms`,
      timestamp: Date.now(),
    });
  }

  // 3. Heap Memory alert (only if heap used is significant > 128MB to avoid Node initial pool noise)
  if (heapUsed > 128 && heapUsagePct >= heapUsageLimit) {
    await sendWebhookAlert(config, {
      title: `High Heap Memory Utilization on ${snapshot.service.name}`,
      description: `V8 Heap utilization reached ${heapUsagePct.toFixed(1)}% (${heapUsed}MB / ${heapTotal}MB). Potential memory leak.`,
      severity: "warning",
      service: snapshot.service.name,
      environment: snapshot.service.environment,
      metric: "V8 Heap Usage",
      value: `${heapUsagePct.toFixed(1)}%`,
      threshold: `${heapUsageLimit}%`,
      timestamp: Date.now(),
    });
  }
}

/**
 * Dispatches an instant alert when a 5xx crash log occurs, if alertOn5xxCrash is enabled.
 */
export async function alertOnCrashLog(
  entry: CapturedErrorRecord,
  config?: AlertConfig,
  serviceInfo?: { name: string; environment: string }
): Promise<void> {
  if (!config || !config.webhookUrl || !config.alertOn5xxCrash) return;

  // 4xx client errors (400, 401, 404, etc.) are normal client behavior and NOT server crashes
  const is5xx = typeof entry.statusCode === "number" ? entry.statusCode >= 500 : true;
  if (!is5xx) return;

  // Fire crash alert immediately without cooldown suppression
  const bypassCooldownConfig = { ...config, cooldownMinutes: 0 };

  await sendWebhookAlert(bypassCooldownConfig, {
    title: `Crash Log: ${entry.method || "HTTP"} ${entry.route || "/"} (${entry.statusCode || 500})`,
    description: `A server crash occurred: ${entry.message.substring(0, 300)}`,
    severity: "critical",
    service: serviceInfo?.name || "stacklenzz-service",
    environment: serviceInfo?.environment || "production",
    metric: "HTTP 5xx Crash",
    value: `${entry.statusCode || 500}`,
    timestamp: entry.timestamp || Date.now(),
  });
}
