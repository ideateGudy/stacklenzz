import { ObservabilityConfig, getDefaultConfig } from "../core/config.js";
import {
  activeRequestsGauge,
  httpRequestCounter,
  httpRequestDuration,
  recordRequestEvent,
} from "../core/metrics.js";
import { logger as defaultLogger, addBreadcrumb } from "../core/logger.js";
import { TraceContext } from "../core/traces.js";
import { getObservabilitySnapshot } from "../core/snapshot.js";
import { register } from "../core/metrics.js";

export interface KoaObservabilityOptions extends Partial<ObservabilityConfig> {
  metricsPath?: string;
  statsPath?: string | false;
}

/**
 * 1-Line Koa Observability Middleware
 *
 * Example:
 * ```ts
 * import Koa from 'koa';
 * import { koaObservability } from '@stacklenzz/server/koa';
 *
 * const app = new Koa();
 * app.use(koaObservability({ serviceName: 'my-koa-api' }));
 * ```
 */
export function koaObservability(options: KoaObservabilityOptions = {}) {
  const config = getDefaultConfig(options);
  const metricsPath = options.metricsPath || "/metrics";
  const statsPath = options.statsPath === undefined ? "/api/observability/stats" : options.statsPath;
  const ignored = new Set(config.ignoredPaths || ["/metrics", "/api/observability/stats", "/favicon.ico"]);

  return async function stacklenzzKoaMiddleware(ctx: any, next: () => Promise<any>): Promise<any> {
    const path = ctx.path || ctx.url || "";

    // Handle /metrics endpoint
    if (path === metricsPath) {
      ctx.set("Content-Type", register.contentType);
      ctx.body = await register.metrics();
      return;
    }

    // Handle /api/observability/stats endpoint
    if (statsPath && path === statsPath) {
      ctx.set("Access-Control-Allow-Origin", "*");
      ctx.set("Content-Type", "application/json");
      ctx.body = await getObservabilitySnapshot(options);
      return;
    }

    if (ignored.has(path)) {
      return next();
    }

    activeRequestsGauge.inc();
    const startTime = process.hrtime();

    try {
      await next();
    } catch (err: any) {
      ctx.status = err.status || 500;
      throw err;
    } finally {
      activeRequestsGauge.dec();
      const diff = process.hrtime(startTime);
      const durationSeconds = diff[0] + diff[1] / 1e9;
      const durationMs = parseFloat((durationSeconds * 1000).toFixed(2));

      const method = ctx.method || "GET";
      const route = ctx._matchedRoute || ctx.path || "unknown";
      const statusCode = ctx.status || 200;
      const statusStr = statusCode.toString();

      httpRequestCounter.inc({ method, route, status_code: statusStr });
      httpRequestDuration.observe({ method, route, status_code: statusStr }, durationSeconds);

      recordRequestEvent({
        timestamp: Date.now(),
        statusCode,
        route,
        method,
        durationMs,
      });

      addBreadcrumb({
        category: "http",
        message: `${method} ${route} -> ${statusCode} (${durationMs}ms)`,
        level: statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info",
      });

      const traceCtx = new TraceContext(`${method} ${route}`, method, route);
      traceCtx.addSpan("Koa Middleware Pipeline", "middleware", durationMs, statusCode >= 500 ? "error" : "ok", {
        route,
        method,
        statusCode,
      });
      traceCtx.end(statusCode, statusCode >= 500 ? "error" : "ok");
    }
  };
}
