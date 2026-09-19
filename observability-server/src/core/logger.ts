import winston from "winston";
import { trace, context } from "@opentelemetry/api";
import { ObservabilityConfig, getDefaultConfig } from "./config.js";

const { combine, timestamp, json, errors } = winston.format;

/**
 * Custom Winston format that injects OpenTelemetry trace_id and span_id
 * as well as service and host metadata into every log entry.
 */
export function createTraceFormat(config: ObservabilityConfig) {
  return winston.format((info) => {
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      info.trace_id = spanContext.traceId;
      info.span_id = spanContext.spanId;
      info.trace_flags = spanContext.traceFlags;
    }
    info.instance_id = config.instanceId;
    info.service = config.serviceName;
    info.environment = config.environment;
    return info;
  });
}

export interface Breadcrumb {
  timestamp: number;
  category: "http" | "db" | "auth" | "log" | "custom";
  message: string;
  level?: "info" | "warn" | "error" | "debug";
  data?: Record<string, any>;
}

export interface CapturedErrorRecord {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  service?: string;
  responseBody?: any;
  // Incident tracking & diagnostics features
  fingerprint?: string;
  occurrences?: number;
  firstSeen?: number;
  lastSeen?: number;
  timestamps?: number[];
  breadcrumbs?: Breadcrumb[];
  context?: {
    os?: string;
    nodeVersion?: string;
    headers?: Record<string, string>;
    query?: Record<string, any>;
    ip?: string;
    memoryMb?: number;
  };
}

export type CrashLogEntry = CapturedErrorRecord;

export interface CrashLogAdaptor {
  save?: (entry: CrashLogEntry) => Promise<void> | void;
  saveCrashLog?: (entry: CrashLogEntry) => Promise<void> | void;
  /**
   * Optional query method to retrieve persisted 5xx crash logs from the database for the UI.
   */
  list?: (options?: { limit?: number; offset?: number }) => Promise<CrashLogEntry[]> | CrashLogEntry[];
  /**
   * Optional method to delete an individual crash log from the database by ID.
   */
  delete?: (id: string) => Promise<void> | void;
  /**
   * Optional method to clear/purge all crash logs from the database.
   */
  clearAll?: () => Promise<void> | void;
}

let activeCrashLogAdaptor: CrashLogAdaptor | undefined = undefined;

export function setCrashLogAdaptor(adaptor?: CrashLogAdaptor): void {
  activeCrashLogAdaptor = adaptor;
}

export function getCrashLogAdaptor(): CrashLogAdaptor | undefined {
  return activeCrashLogAdaptor;
}

/**
 * Non-blocking fire-and-forget helper that notifies the registered DB adaptor
 * only for 5xx errors or uncaught server crashes.
 */
function notifyCrashLogAdaptor(entry: CrashLogEntry): void {
  const adaptor = activeCrashLogAdaptor;
  if (!adaptor) return;

  // Only trigger for 5xx or uncaught exceptions (status undefined defaults to 500 crash)
  const is5xx = typeof entry.statusCode === "number" ? entry.statusCode >= 500 : true;
  if (!is5xx) return;

  // Fire-and-forget: execute asynchronously and catch all errors to protect host app
  Promise.resolve().then(async () => {
    try {
      if (typeof adaptor.save === "function") {
        await adaptor.save(entry);
      } else if (typeof adaptor.saveCrashLog === "function") {
        await adaptor.saveCrashLog(entry);
      }
    } catch {
      // Deliberately swallow errors so failing DB writes never crash or disrupt the host process
    }
  }).catch(() => {
    // Catch-all safety guard
  });
}

const MAX_ERROR_BUFFER_SIZE = 50;
const errorRingBuffer: CapturedErrorRecord[] = [];

// Global breadcrumb ring buffer (records recent app operations leading up to any failure)
const MAX_BREADCRUMBS = 30;
const breadcrumbRingBuffer: Breadcrumb[] = [];

/**
 * Adds a breadcrumb (trail of events) leading up to an error.
 */
export function addBreadcrumb(crumb: {
  category?: "http" | "db" | "auth" | "log" | "custom";
  message: string;
  level?: "info" | "warn" | "error" | "debug";
  data?: Record<string, any>;
}): void {
  const item: Breadcrumb = {
    timestamp: Date.now(),
    category: crumb.category || "custom",
    message: crumb.message,
    level: crumb.level || "info",
    data: crumb.data,
  };
  breadcrumbRingBuffer.push(item);
  if (breadcrumbRingBuffer.length > MAX_BREADCRUMBS) {
    breadcrumbRingBuffer.shift();
  }
}

/**
 * Returns recent breadcrumbs.
 */
export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbRingBuffer];
}

/**
 * Computes a deterministic fingerprint for an error to group recurring issues.
 */
export function computeFingerprint(err: {
  message: string;
  route?: string;
  stack?: string;
  statusCode?: number;
}): string {
  // Normalize message: strip numbers, ids, timestamps to group same error class
  const normalizedMsg = (err.message || "")
    .replace(/\b\d+\b/g, ":num")
    .replace(/[0-9a-fA-F-]{16,}/g, ":id")
    .trim();
  const route = err.route || "general";
  const status = err.statusCode || 500;
  return `${status}-${route}-${normalizedMsg.slice(0, 80)}`;
}

/**
 * Returns the most recent captured application and HTTP errors.
 */
export function getRecentErrors(): CapturedErrorRecord[] {
  return [...errorRingBuffer];
}

/**
 * Records an error into the internal ring buffer with fingerprint grouping and breadcrumbs.
 */
export function recordError(err: {
  message: string;
  stack?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  service?: string;
  responseBody?: any;
  context?: CapturedErrorRecord["context"];
  breadcrumbs?: Breadcrumb[];
}): void {
  const fingerprint = computeFingerprint(err);
  const now = Date.now();

  // Check if this fingerprint already exists in our active buffer (grouping feature)
  const existing = errorRingBuffer.find((e) => e.fingerprint === fingerprint);
  if (existing) {
    existing.occurrences = (existing.occurrences || 1) + 1;
    existing.lastSeen = now;
    existing.timestamp = now;
    if (!existing.timestamps) {
      existing.timestamps = [existing.firstSeen || now];
    }
    existing.timestamps.push(now);
    // Keep up to 100 historical occurrence timestamps
    if (existing.timestamps.length > 100) {
      existing.timestamps.shift();
    }
    if (err.responseBody) existing.responseBody = err.responseBody;
    if (err.stack) existing.stack = err.stack;
    if (err.breadcrumbs && err.breadcrumbs.length > 0) {
      existing.breadcrumbs = err.breadcrumbs;
    } else {
      existing.breadcrumbs = breadcrumbRingBuffer.slice(-10);
    }
    notifyCrashLogAdaptor(existing);
    return;
  }

  // Snapshot recent breadcrumbs for this new error
  const breadcrumbs = err.breadcrumbs && err.breadcrumbs.length > 0
    ? err.breadcrumbs
    : breadcrumbRingBuffer.slice(-10);

  const memMb = Math.round(process.memoryUsage().heapUsed / (1024 * 1024));

  const record: CapturedErrorRecord = {
    id: `err-${now}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    message: err.message,
    stack: err.stack,
    route: err.route,
    method: err.method,
    statusCode: err.statusCode,
    service: err.service,
    responseBody: err.responseBody,
    fingerprint,
    occurrences: 1,
    firstSeen: now,
    lastSeen: now,
    timestamps: [now],
    breadcrumbs,
    context: {
      os: `${process.platform} (${process.arch})`,
      nodeVersion: process.version,
      memoryMb: memMb,
      ...(err.context || {}),
    },
  };

  errorRingBuffer.unshift(record);
  if (errorRingBuffer.length > MAX_ERROR_BUFFER_SIZE) {
    errorRingBuffer.pop();
  }
  notifyCrashLogAdaptor(record);
}

/**
 * Custom Winston format that automatically catches errors logged and records them in the ring buffer.
 */
export function createErrorCaptureFormat() {
  return winston.format((info) => {
    if (info.level === "error") {
      let rawMsg = info.message || info.error;
      const stack = typeof info.stack === "string" ? info.stack : undefined;
      const route = typeof info.route === "string" ? info.route : (typeof info.url === "string" ? info.url : undefined);
      const method = typeof info.method === "string" ? info.method : undefined;
      const statusCode = typeof info.status === "number" ? info.status : (typeof info.statusCode === "number" ? info.statusCode : 500);
      const responseBody = info.responseBody || info.body || info.data;

      // If this is the automatic request-finish middleware log
      const isMiddlewareSummary = Boolean(info.isMiddlewareSummary) ||
        (typeof rawMsg === "string" && (rawMsg.includes("HTTP Server Error") || rawMsg.includes("HTTP Client Error")));

      if (isMiddlewareSummary) {
        // If an explicit error was already logged for this request/route within the last 5 seconds, attach response body if missing
        const normalizedRoute = (route || "").trim().toLowerCase();
        const existingRecent = errorRingBuffer.find((e) => {
          const eRoute = (e.route || "").trim().toLowerCase();
          const routeMatches = eRoute === normalizedRoute || normalizedRoute.includes(eRoute) || eRoute.includes(normalizedRoute);
          const notGeneric = !e.message.includes("HTTP Server Error") && !e.message.includes("HTTP Client Error");
          const isFresh = Date.now() - e.timestamp < 5000;
          return routeMatches && notGeneric && isFresh;
        });

        if (existingRecent) {
          if (!existingRecent.responseBody && responseBody) {
            existingRecent.responseBody = responseBody;
          }
          return info;
        }
      }

      // If responseBody has detailed message or error, format message clearly
      let errorMsg = rawMsg;
      if (responseBody && typeof responseBody === "object") {
        const resObj = responseBody as Record<string, any>;
        if (resObj.message && resObj.error) {
          errorMsg = `${resObj.error}: ${resObj.message}`;
        } else if (resObj.message) {
          errorMsg = resObj.message;
        } else if (resObj.error) {
          errorMsg = resObj.error;
        }
      }

      if (!errorMsg) {
        errorMsg = stack ? stack.split("\n")[0] : "Internal Server Error";
      }

      const reqObj = info.req as Record<string, any> | undefined;
      const contextData = (info.context as any) || (reqObj ? {
        headers: reqObj.headers ? {
          "user-agent": reqObj.headers["user-agent"],
          "host": reqObj.headers["host"],
          "content-type": reqObj.headers["content-type"],
        } : undefined,
        query: reqObj.query,
        ip: reqObj.ip || (reqObj.socket ? reqObj.socket.remoteAddress : undefined),
      } : undefined);

      recordError({
        message: typeof errorMsg === "object" ? JSON.stringify(errorMsg) : String(errorMsg),
        stack,
        route,
        method,
        statusCode,
        service: typeof info.service === "string" ? info.service : undefined,
        responseBody,
        context: contextData,
      });
    } else {
      // Record info / warn / debug as breadcrumbs for future errors
      const msg = typeof info.message === "string" ? info.message : JSON.stringify(info.message || "");
      if (msg && !msg.includes("/api/observability/stats")) {
        const metaData = info.meta && typeof info.meta === "object" ? (info.meta as Record<string, any>) : undefined;
        addBreadcrumb({
          category: "log",
          message: msg,
          level: (info.level as any) || "info",
          data: metaData,
        });
      }
    }
    return info;
  });
}

/**
 * Factory to create a structured Winston logger with OTel context injection.
 */
export function createObservabilityLogger(
  configOverrides?: Partial<ObservabilityConfig>,
  additionalTransports: winston.transport[] = []
): winston.Logger {
  const config = getDefaultConfig(configOverrides);
  const traceFormat = createTraceFormat(config);
  const errorCaptureFormat = createErrorCaptureFormat();

  const transports: winston.transport[] = [
    new winston.transports.Console(),
    ...additionalTransports,
  ];

  return winston.createLogger({
    level: config.logLevel,
    format: combine(
      errors({ stack: true }),
      errorCaptureFormat(),
      traceFormat(),
      timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
      json()
    ),
    defaultMeta: {
      service: config.serviceName,
    },
    transports,
  });
}

export const logger = createObservabilityLogger();
export { winston };
