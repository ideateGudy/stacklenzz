import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { finalize, tap, catchError } from "rxjs/operators";
import { OBSERVABILITY_OPTIONS } from "./interfaces.js";
import type { NestObservabilityOptions } from "./interfaces.js";
import { getDefaultConfig } from "../core/config.js";
import {
  activeRequestsGauge,
  httpRequestCounter,
  httpRequestDuration,
  recordRequestEvent,
} from "../core/metrics.js";
import { logger as defaultLogger, addBreadcrumb } from "../core/logger.js";
import type { Logger } from "winston";

@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  private readonly loggerInstance: Logger;
  private readonly ignoredPaths: Set<string>;
  private readonly metricsPath: string;

  constructor(
    @Optional()
    @Inject(OBSERVABILITY_OPTIONS)
    private readonly options: NestObservabilityOptions = {}
  ) {
    const config = getDefaultConfig(options);
    this.loggerInstance = options.customLogger || defaultLogger;
    this.metricsPath = options.metricsPath || "metrics";
    this.ignoredPaths = new Set(
      config.ignoredPaths?.map((p) => p.replace(/^\//, "")) || [
        "metrics",
        "healthz",
        "health",
      ]
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const hostType = context.getType();
    if (hostType !== "http") {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest();
    const res = httpContext.getResponse();

    const rawPath = (req.path || req.url || "").replace(/^\//, "");
    if (
      rawPath === this.metricsPath ||
      this.ignoredPaths.has(rawPath) ||
      (this.options.shouldIgnoreRoute && this.options.shouldIgnoreRoute(req))
    ) {
      return next.handle();
    }

    activeRequestsGauge.inc();
    const startTime = process.hrtime();
    let responseData: any = undefined;
    let thrownError: any = undefined;

    return next.handle().pipe(
      tap((val) => {
        responseData = val;
      }),
      catchError((err) => {
        thrownError = err;
        const status = typeof err?.getStatus === "function" ? err.getStatus() : (err?.status || 500);
        const errResponse = typeof err?.getResponse === "function" ? err.getResponse() : (err?.message || "Internal server error");
        responseData = {
          status,
          response: errResponse,
        };
        return throwError(() => err);
      }),
      finalize(() => {
        activeRequestsGauge.dec();
        const diff = process.hrtime(startTime);
        const durationSeconds = diff[0] + diff[1] / 1e9;
        const durationMs = parseFloat((durationSeconds * 1000).toFixed(2));

        const route =
          (req.baseUrl || "") +
          (req.route?.path || req.url || req.raw?.url || "unknown");
        const errorStatus = thrownError
          ? (typeof thrownError?.getStatus === "function" ? thrownError.getStatus() : (thrownError?.status || 500))
          : (responseData?.status ? Number(responseData.status) : undefined);

        const statusCodeNum = (res.statusCode && res.statusCode !== 200)
          ? res.statusCode
          : (errorStatus || res.statusCode || 200);
        const statusCode = statusCodeNum.toString();

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

        // Record for sliding time windows (1m, 5m, 1h, 24h, etc.)
        recordRequestEvent({
          timestamp: Date.now(),
          statusCode: statusCodeNum,
          route,
          method: req.method,
          durationMs,
        });

        // Record HTTP request breadcrumb
        addBreadcrumb({
          category: "http",
          message: `${req.method} ${route} -> ${statusCodeNum} (${durationMs}ms)`,
          level: statusCodeNum >= 500 ? "error" : statusCodeNum >= 400 ? "warn" : "info",
          data: {
            url: req.originalUrl || req.url,
            statusCode: statusCodeNum,
            durationMs,
          },
        });

        let capturedResponseBody: string | undefined = undefined;
        if (responseData !== undefined) {
          try {
            capturedResponseBody = typeof responseData === "object"
              ? JSON.stringify(responseData).slice(0, 1000)
              : String(responseData).slice(0, 1000);
          } catch {
            // ignore serialization issue
          }
        }

        const logData = {
          method: req.method,
          url: req.originalUrl || req.url,
          route,
          status: statusCodeNum,
          duration_ms: durationMs,
          responseBody: capturedResponseBody,
          context: {
            headers: {
              "user-agent": req.headers?.["user-agent"] as string,
              "host": req.headers?.["host"] as string,
              "content-type": req.headers?.["content-type"] as string,
            },
            query: req.query,
            ip: req.ip || req.socket?.remoteAddress,
          },
        };

        if (statusCodeNum < 400) {
          this.loggerInstance.info(
            `HTTP Request: ${req.method} ${req.originalUrl || req.url}`,
            logData
          );
        }
      })
    );
  }
}
