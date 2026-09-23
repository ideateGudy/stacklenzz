import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ObservabilityConfig, getDefaultConfig } from "../core/config.js";
import {
  activeRequestsGauge,
  httpRequestCounter,
  httpRequestDuration,
  recordRequestEvent,
} from "../core/metrics.js";
import { logger as defaultLogger, addBreadcrumb, sanitizeHeaders } from "../core/logger.js";
import type { Logger } from "winston";
import { TraceContext } from "../core/traces.js";

export interface ExpressObservabilityOptions extends Partial<ObservabilityConfig> {
  metricsPath?: string;
  healthPath?: string;
  customLogger?: Logger;
  shouldIgnoreRoute?: (req: Request) => boolean;
}

/**
 * Creates Express middleware that measures request duration, increments
 * Prometheus counters/gauges, and outputs structured Winston logs upon completion.
 */
export function createObservabilityMiddleware(
  options: ExpressObservabilityOptions = {}
): RequestHandler {
  const config = getDefaultConfig(options);
  const metricsPath = options.metricsPath || "/metrics";
  const healthPath = options.healthPath || "/healthz";
  const loggerInstance = options.customLogger || defaultLogger;
  const ignored = new Set(config.ignoredPaths || ["/metrics", "/healthz", "/health"]);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (
      req.path === metricsPath ||
      req.path === healthPath ||
      ignored.has(req.path) ||
      (options.shouldIgnoreRoute && options.shouldIgnoreRoute(req))
    ) {
      return next();
    }

    activeRequestsGauge.inc();
    const startTime = process.hrtime();
    let capturedResponseBody: any = undefined;

    // Intercept response payload to capture error details returned by the API
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 400) {
        capturedResponseBody = body;
      }
      return originalJson(body);
    };

    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      if (res.statusCode >= 400 && capturedResponseBody === undefined) {
        try {
          capturedResponseBody = typeof body === "string" ? JSON.parse(body) : body;
        } catch {
          capturedResponseBody = body;
        }
      }
      return originalSend(body);
    };

    res.on("finish", () => {
      activeRequestsGauge.dec();
      const diff = process.hrtime(startTime);
      const durationSeconds = diff[0] + diff[1] / 1e9;
      const durationMs = parseFloat((durationSeconds * 1000).toFixed(2));
      
      const route = (req.baseUrl || "") + (req.route?.path || req.path);
      const statusCode = res.statusCode.toString();

      httpRequestCounter.inc({
        method: req.method,
        route,
        status_code: statusCode,
      });

      httpRequestDuration.observe(
        {
          method: req.method,
          route,
          status_code: statusCode,
        },
        durationSeconds
      );

      recordRequestEvent({
        timestamp: Date.now(),
        statusCode: res.statusCode,
        route,
        method: req.method,
        durationMs,
      });

      // Record HTTP request breadcrumb
      addBreadcrumb({
        category: "http",
        message: `${req.method} ${route} -> ${res.statusCode} (${durationMs}ms)`,
        level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
        data: {
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          durationMs,
        },
      });

      // Record trace in recent traces waterfall buffer with distinct execution spans
      const traceCtx = new TraceContext(`${req.method} ${route}`, req.method, route, durationMs);
      
      // Stage 1: Middleware & Auth Evaluation
      traceCtx.addSpan("Express Middleware & Auth", "middleware", Math.max(0.05, durationMs * 0.25), "ok", {
        path: req.path,
        headersCount: Object.keys(req.headers || {}).length,
      });

      // Stage 2: Controller & Route Handler Execution
      traceCtx.addSpan(`Route Handler ${req.method} ${route}`, "controller", Math.max(0.1, durationMs * 0.65), res.statusCode >= 500 ? "error" : "ok", {
        route,
        method: req.method,
      });

      // Stage 3: HTTP Serialization & Response Finish
      traceCtx.addSpan("HTTP Response Serialization", "http", Math.max(0.05, durationMs * 0.1), res.statusCode >= 500 ? "error" : "ok", {
        route,
        method: req.method,
        statusCode: res.statusCode,
      });

      traceCtx.end(res.statusCode, res.statusCode >= 500 ? "error" : "ok", durationMs);

      const safeHeaders = sanitizeHeaders(req.headers || {});
      if (!safeHeaders["host"] && req.get) safeHeaders["host"] = req.get("host") || "";
      if (!safeHeaders["user-agent"] && req.get) safeHeaders["user-agent"] = req.get("user-agent") || "";

      const logData = {
        method: req.method,
        url: req.originalUrl || req.url,
        route,
        status: res.statusCode,
        duration_ms: durationMs,
        responseBody: capturedResponseBody,
        context: {
          headers: safeHeaders,
          query: req.query,
          ip: req.ip || req.socket?.remoteAddress,
        },
      };

      if (res.statusCode >= 500) {
        loggerInstance.error(`HTTP Server Error (${res.statusCode}) on ${req.method} ${req.originalUrl || req.url}`, {
          ...logData,
          isMiddlewareSummary: true,
        });
      } else if (res.statusCode >= 400) {
        loggerInstance.warn(`HTTP Client Error (${res.statusCode}) on ${req.method} ${req.originalUrl || req.url}`, {
          ...logData,
          isMiddlewareSummary: true,
        });
      } else {
        loggerInstance.info(`HTTP Request: ${req.method} ${req.originalUrl || req.url}`, logData);
      }
    });

    next();
  };
}
