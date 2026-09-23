export interface SpanRecord {
  id: string;
  name: string;
  type: "http" | "controller" | "guard" | "interceptor" | "middleware" | "database" | "external" | "job" | "custom";
  durationMs: number;
  startTime: number;
  endTime: number;
  status: "ok" | "error";
  attributes?: Record<string, any>;
  children?: SpanRecord[];
}

export interface TraceRecord {
  traceId: string;
  rootSpanName: string;
  method?: string;
  route?: string;
  statusCode?: number;
  durationMs: number;
  startTime: number;
  status: "ok" | "error";
  spans: SpanRecord[];
}

const MAX_TRACES = 50;
const traceRingBuffer: TraceRecord[] = [];

/**
 * Stores a completed trace in the in-memory ring buffer.
 */
export function recordTrace(trace: TraceRecord): void {
  traceRingBuffer.unshift(trace);
  if (traceRingBuffer.length > MAX_TRACES) {
    traceRingBuffer.pop();
  }
}

/**
 * Retrieves recently sampled traces.
 */
export function getRecentTraces(limit: number = 20): TraceRecord[] {
  return traceRingBuffer.slice(0, limit);
}

let activeCurrentTrace: TraceContext | null = null;

export function getActiveTraceContext(): TraceContext | null {
  return activeCurrentTrace;
}

export function setActiveTraceContext(ctx: TraceContext | null): void {
  activeCurrentTrace = ctx;
}

/**
 * Helper to record a database execution span (PostgreSQL, MongoDB, Prisma, Redis) within the active request trace.
 */
export async function trackDatabaseQuery<T>(
  queryName: string,
  fn: () => Promise<T> | T,
  attributes?: Record<string, any>
): Promise<T> {
  const startTime = Date.now();
  const ctx = getActiveTraceContext();
  try {
    const result = await fn();
    const durationMs = Math.max(0.5, Date.now() - startTime);
    if (ctx) {
      ctx.addSpan(queryName, "database", durationMs, "ok", {
        query: queryName,
        ...(attributes || {}),
      });
    }
    return result;
  } catch (err: any) {
    const durationMs = Math.max(0.5, Date.now() - startTime);
    if (ctx) {
      ctx.addSpan(queryName, "database", durationMs, "error", {
        query: queryName,
        error: err?.message || String(err),
        ...(attributes || {}),
      });
    }
    throw err;
  }
}

/**
 * Helper to build a trace execution tree.
 */
export class TraceContext {
  public traceId: string;
  public rootSpanName: string;
  public startTime: number;
  public spans: SpanRecord[] = [];
  public method?: string;
  public route?: string;
  public statusCode?: number;
  public explicitDurationMs?: number;

  constructor(rootSpanName: string, method?: string, route?: string, explicitDurationMs?: number) {
    this.traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.rootSpanName = rootSpanName;
    this.method = method;
    this.route = route;
    this.explicitDurationMs = explicitDurationMs;
    this.startTime = explicitDurationMs ? Date.now() - explicitDurationMs : Date.now();
    setActiveTraceContext(this);
  }

  public addSpan(
    name: string,
    type: SpanRecord["type"],
    durationMs: number,
    status: "ok" | "error" = "ok",
    attributes?: Record<string, any>
  ): void {
    const now = Date.now();
    this.spans.push({
      id: `span_${this.spans.length + 1}`,
      name,
      type,
      durationMs: parseFloat(durationMs.toFixed(2)),
      startTime: now - durationMs,
      endTime: now,
      status,
      attributes,
    });
  }

  public end(statusCode: number = 200, status: "ok" | "error" = "ok", overrideDurationMs?: number): TraceRecord {
    this.statusCode = statusCode;
    const computedDuration = overrideDurationMs ?? this.explicitDurationMs ?? (Date.now() - this.startTime);
    const durationMs = parseFloat(Math.max(0.01, computedDuration).toFixed(2));
    const record: TraceRecord = {
      traceId: this.traceId,
      rootSpanName: this.rootSpanName,
      method: this.method,
      route: this.route,
      statusCode: this.statusCode,
      durationMs,
      startTime: this.startTime,
      status,
      spans: this.spans,
    };
    recordTrace(record);
    if (activeCurrentTrace === this) {
      setActiveTraceContext(null);
    }
    return record;
  }
}
