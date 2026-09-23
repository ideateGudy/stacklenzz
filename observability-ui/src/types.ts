export interface EndpointMetricSummary {
  method: string;
  route: string;
  requests: number;
  avgDurationMs: number;
  p95DurationMs: number;
  errorCount: number;
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

export interface TimeWindowStats {
  totalRequests: number;
  errorRequests: number;
  errorRate: number;
  avgDurationMs: number;
}

export interface SpanRecord {
  id: string;
  name: string;
  type: "http" | "controller" | "guard" | "interceptor" | "middleware" | "database" | "external" | "job" | "custom";
  durationMs: number;
  startTime: number;
  endTime: number;
  status: "ok" | "error";
  attributes?: Record<string, any>;
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

export interface JobRecord {
  id: string;
  name: string;
  queue?: string;
  status: "completed" | "failed" | "running";
  durationMs?: number;
  startTime: number;
  endTime?: number;
  error?: string;
  attempts?: number;
}

export interface JobMetricsSummary {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  failureRate: number;
  avgDurationMs: number;
  recentJobs: JobRecord[];
}

export interface ObservabilitySnapshot {
  service: {
    name: string;
    environment: string;
    version?: string;
    release?: string;
    uptimeSeconds: number;
    timestamp: number;
  };
  summary: {
    totalRequests: number;
    activeRequests: number;
    errorRate: number; // e.g. 0.35 (%)
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    avgLatencyMs: number;
  };
  slo?: {
    availabilityTarget: number;
    currentAvailability: number;
    errorBudgetPercent: number; // 0 - 100
    burnRate: number;
    status: "healthy" | "at_risk" | "breached";
  };
  windows?: {
    last1m: TimeWindowStats;
    last5m: TimeWindowStats;
    last15m: TimeWindowStats;
    last30m: TimeWindowStats;
    last1h: TimeWindowStats;
    last2h: TimeWindowStats;
    last24h: TimeWindowStats;
    last7d: TimeWindowStats;
    last30d: TimeWindowStats;
  };
  http: {
    statusBreakdown: {
      status2xx: number;
      status3xx: number;
      status4xx: number;
      status5xx: number;
    };
    topEndpoints: EndpointMetricSummary[];
  };
  runtime: {
    cpuPercent: number;
    memoryRssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    eventLoopLagMs: number;
    nodeVersion: string;
  };
  traces?: TraceRecord[];
  jobs?: JobMetricsSummary;
  recentErrors?: CapturedErrorRecord[];
  breadcrumbs?: Breadcrumb[];
  /**
   * Persisted 5xx crash logs retrieved from the developer's database adaptor.
   */
  dbCrashLogs?: CapturedErrorRecord[];
}

export type CrashLogEntry = CapturedErrorRecord;

import { RuntimeTheme } from "./themes.js";

export interface ObservabilityConfig {
  endpoint?: string;
  refreshIntervalMs?: number;
  mockMode?: boolean;
  theme?: RuntimeTheme | "dark" | "light" | "auto";
  token?: string;
}

export type DashboardTemplate =
  | "full"
  | "api-overview"
  | "performance"
  | "errors"
  | "runtime"
  | "minimal"
  | "crash-logs";

