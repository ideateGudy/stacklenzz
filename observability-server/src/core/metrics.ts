import client, { Registry, Counter, Histogram, Gauge } from "@prometheus-io/client";
import { ObservabilityConfig, getDefaultConfig } from "./config.js";

let defaultRegistry: Registry = client.register;
let defaultMetricsInitialized = false;

let httpRequestCounter: Counter<string>;
let httpRequestDuration: Histogram<string>;
let activeRequestsGauge: Gauge<string>;

export interface RequestEventRecord {
  timestamp: number;
  statusCode: number;
  route: string;
  method: string;
  durationMs: number;
}

const MAX_WINDOW_EVENTS = 5000;
const requestEventBuffer: RequestEventRecord[] = [];

/**
 * Records an individual request completion for sliding window analytics.
 */
export function recordRequestEvent(event: RequestEventRecord): void {
  requestEventBuffer.push(event);
  if (requestEventBuffer.length > MAX_WINDOW_EVENTS) {
    requestEventBuffer.shift();
  }
}

/**
 * Clears in-memory request event buffers and metrics for testing.
 */
export function resetMetrics(): void {
  requestEventBuffer.length = 0;
  if (defaultRegistry) {
    defaultRegistry.resetMetrics();
  }
}

/**
 * Calculates metrics within a specific time window in milliseconds.
 */
export function getWindowMetrics(windowMs: number): {
  totalRequests: number;
  errorRequests: number;
  errorRate: number;
  avgDurationMs: number;
} {
  const cutoff = Date.now() - windowMs;
  let total = 0;
  let errors = 0;
  let durationSum = 0;

  for (let i = requestEventBuffer.length - 1; i >= 0; i--) {
    const ev = requestEventBuffer[i];
    if (ev.timestamp < cutoff) break;
    total++;
    durationSum += ev.durationMs;
    if (ev.statusCode >= 500) {
      errors++;
    }
  }

  const errorRate = total > 0 ? parseFloat(((errors / total) * 100).toFixed(2)) : 0;
  const avgDurationMs = total > 0 ? parseFloat((durationSum / total).toFixed(1)) : 0;

  return {
    totalRequests: total,
    errorRequests: errors,
    errorRate,
    avgDurationMs,
  };
}

/**
 * Initializes and configures Prometheus metrics.
 */
export function initMetrics(configOverrides?: Partial<ObservabilityConfig>): {
  register: Registry;
  httpRequestCounter: Counter<string>;
  httpRequestDuration: Histogram<string>;
  activeRequestsGauge: Gauge<string>;
} {
  const config = getDefaultConfig(configOverrides);
  const register = defaultRegistry;

  // Guard against re-registering default metrics across multi-entry imports or global registries
  if (!defaultMetricsInitialized) {
    try {
      client.collectDefaultMetrics({
        prefix: config.metricsPrefix,
        register,
      });
    } catch {
      // Already registered in default registry
    }
    defaultMetricsInitialized = true;
  }

  const existingRequestsTotal = register.getSingleMetric("http_requests_total") as Counter<string> | undefined;
  if (!httpRequestCounter) {
    httpRequestCounter = existingRequestsTotal || new client.Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests processed",
      labelNames: ["method", "route", "status_code"],
      registers: [register],
    });
  }

  const existingDuration = register.getSingleMetric("http_request_duration_seconds") as Histogram<string> | undefined;
  if (!httpRequestDuration) {
    httpRequestDuration = existingDuration || new client.Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: config.durationBuckets,
      registers: [register],
    });
  }

  const existingActive = register.getSingleMetric("http_active_requests") as Gauge<string> | undefined;
  if (!activeRequestsGauge) {
    activeRequestsGauge = existingActive || new client.Gauge({
      name: "http_active_requests",
      help: "Current number of in-flight HTTP requests",
      registers: [register],
    });
  }

  return {
    register,
    httpRequestCounter,
    httpRequestDuration,
    activeRequestsGauge,
  };
}

export const metrics = initMetrics();
export const register = metrics.register;
export {
  client,
  Registry,
  Counter,
  Histogram,
  Gauge,
};
export {
  httpRequestCounter,
  httpRequestDuration,
  activeRequestsGauge,
};
