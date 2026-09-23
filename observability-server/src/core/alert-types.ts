export type AlertChannelType = "slack" | "discord" | "generic";

export interface AlertConfig {
  /**
   * Slack, Discord, or generic incoming webhook URL.
   */
  webhookUrl?: string;

  /**
   * Channel format. Auto-detected from webhook URL if omitted.
   */
  channelType?: AlertChannelType;

  /**
   * Error rate threshold (percentage, e.g. 5 for 5%) to trigger critical alerts.
   * Defaults to 5.
   */
  errorRateThreshold?: number;

  /**
   * P95 latency threshold in ms to trigger degraded alerts.
   * Defaults to 1000ms.
   */
  p95LatencyThresholdMs?: number;

  /**
   * Heap memory percent threshold (0-100) to trigger alert.
   * Defaults to 85%.
   */
  heapUsagePercentThreshold?: number;

  /**
   * Minimum minutes between sending identical alert conditions.
   * Defaults to 15.
   */
  cooldownMinutes?: number;

  /**
   * Whether to send an alert immediately on every 5xx crash log.
   * Defaults to false (batches or triggers on SLA degradation).
   */
  alertOn5xxCrash?: boolean;
}

export interface SloConfig {
  /**
   * Target availability percentage, e.g. 99.9 or 99.5.
   * Defaults to 99.5.
   */
  availabilityTarget?: number;

  /**
   * Target latency in ms (e.g. 95% of requests should be faster than targetLatencyMs).
   * Defaults to 300ms.
   */
  targetLatencyMs?: number;

  /**
   * Target latency percentile to evaluate against (e.g. 95 for p95, 99 for p99).
   * Defaults to 95.
   */
  latencyPercentile?: 95 | 99 | 50;

  /**
   * Rolling window in days for SLA budget calculation.
   * Defaults to 30.
   */
  periodDays?: number;
}
