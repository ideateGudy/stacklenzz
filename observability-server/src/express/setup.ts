import type { Express } from "express";
import {
  createObservabilityMiddleware,
  ExpressObservabilityOptions,
} from "./middleware.js";
import { createMetricsHandler, createStatsHandler } from "./metrics-route.js";
import { initTracing } from "../core/tracing.js";
import { setCrashLogAdaptor } from "../core/logger.js";

export interface SetupExpressObservabilityOptions extends ExpressObservabilityOptions {
  /**
   * Automatically initialize OpenTelemetry NodeSDK tracing.
   * Defaults to true.
   */
  autoInitTracing?: boolean;

  /**
   * Path for JSON telemetry snapshot for dashboard UI.
   * Defaults to '/api/observability/stats'. Set to false or empty string to disable.
   */
  statsPath?: string | false;
}

/**
 * Attaches request monitoring middleware, Prometheus /metrics endpoint,
 * and live telemetry snapshot endpoint to Express in one call.
 */
export function setupObservability(
  app: Express,
  options: SetupExpressObservabilityOptions = {}
): void {
  if (options.autoInitTracing !== false) {
    initTracing(options);
  }

  if (options.crashLogAdaptor) {
    setCrashLogAdaptor(options.crashLogAdaptor);
  }

  const metricsPath = options.metricsPath || "/metrics";
  const statsPath = options.statsPath === undefined ? "/api/observability/stats" : options.statsPath;

  // Ensure statsPath and metricsPath are automatically ignored from metric counters
  const extraIgnored = [metricsPath];
  if (statsPath) {
    extraIgnored.push(statsPath);
  }
  const mergedIgnored = Array.from(
    new Set([...(options.ignoredPaths || ["/metrics", "/healthz", "/health", "/api/observability/stats"]), ...extraIgnored])
  );

  // Attach middleware with statsPath ignored
  app.use(createObservabilityMiddleware({ ...options, ignoredPaths: mergedIgnored }));

  // Attach /metrics endpoint (Prometheus format)
  app.get(metricsPath, createMetricsHandler(options));

  // Attach /api/observability/stats endpoint (JSON format for frontend dashboard)
  if (statsPath) {
    app.get(statsPath, createStatsHandler({ customLogger: options.customLogger, configOverrides: options }));
  }
}
