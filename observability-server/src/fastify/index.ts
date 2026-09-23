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

export interface FastifyObservabilityOptions extends Partial<ObservabilityConfig> {
  metricsPath?: string;
  statsPath?: string | false;
}

/**
 * 1-Line Fastify Observability Plugin
 *
 * Example:
 * ```ts
 * import Fastify from 'fastify';
 * import { fastifyObservability } from '@stacklenzz/server/fastify';
 *
 * const app = Fastify();
 * await app.register(fastifyObservability, { serviceName: 'my-fastify-api' });
 * ```
 */
export async function fastifyObservability(
  fastify: any,
  options: FastifyObservabilityOptions = {}
): Promise<void> {
  const config = getDefaultConfig(options);
  const metricsPath = options.metricsPath || "/metrics";
  const statsPath = options.statsPath === undefined ? "/api/observability/stats" : options.statsPath;
  const ignored = new Set(config.ignoredPaths || ["/metrics", "/api/observability/stats", "/favicon.ico"]);

  // Fastify onRequest Hook
  fastify.addHook("onRequest", (req: any, reply: any, done: () => void) => {
    const rawUrl = req.raw?.url || req.url || "";
    if (rawUrl === metricsPath || (statsPath && rawUrl === statsPath) || ignored.has(rawUrl)) {
      return done();
    }
    activeRequestsGauge.inc();
    req._stacklenzzStartTime = process.hrtime();
    done();
  });

  // Fastify onResponse Hook
  fastify.addHook("onResponse", (req: any, reply: any, done: () => void) => {
    if (!req._stacklenzzStartTime) return done();

    activeRequestsGauge.dec();
    const diff = process.hrtime(req._stacklenzzStartTime);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const durationMs = parseFloat((durationSeconds * 1000).toFixed(2));

    const method = req.method || "GET";
    const route = req.routeOptions?.url || req.routerPath || req.raw?.url || req.url || "unknown";
    const statusCode = reply.statusCode || 200;
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
    traceCtx.addSpan("Fastify Route Execution", "http", durationMs, statusCode >= 500 ? "error" : "ok", {
      route,
      method,
      statusCode,
    });
    traceCtx.end(statusCode, statusCode >= 500 ? "error" : "ok");

    done();
  });

  // Attach /metrics endpoint
  fastify.get(metricsPath, async (req: any, reply: any) => {
    reply.header("Content-Type", register.contentType);
    return register.metrics();
  });

  // Attach /api/observability/stats endpoint
  if (statsPath) {
    fastify.get(statsPath, async (req: any, reply: any) => {
      reply.header("Access-Control-Allow-Origin", "*");
      const snapshot = await getObservabilitySnapshot(options);
      return snapshot;
    });
  }
}
