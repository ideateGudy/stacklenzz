import type { CrashLogAdaptor } from "./logger.js";

export interface ObservabilityConfig {
  /**
   * Name of your application service.
   * Defaults to OTEL_SERVICE_NAME or PROJECT_NAME or 'stacklenzz-server'
   */
  serviceName: string;

  /**
   * Deployment environment (e.g. 'development', 'staging', 'production').
   * Defaults to NODE_ENV or 'development'
   */
  environment: string;

  /**
   * Unique host / instance identifier.
   * Defaults to EC2_INSTANCE_ID or HOSTNAME or 'local'
   */
  instanceId: string;

  /**
   * OTLP HTTP collector endpoint (e.g. 'http://localhost:4318').
   * Defaults to OTEL_EXPORTER_OTLP_ENDPOINT or 'http://localhost:4318'
   */
  otlpEndpoint: string;

  /**
   * Winston log level (e.g. 'info', 'debug', 'warn', 'error').
   * Defaults to LOG_LEVEL or 'info'
   */
  logLevel: string;

  /**
   * Whether OpenTelemetry distributed tracing is active.
   * Defaults to true unless ENABLE_TRACING === 'false'
   */
  enableTracing: boolean;

  /**
   * Service version (e.g. '1.0.0').
   * Defaults to '1.0.0'
   */
  serviceVersion?: string;

  /**
   * Prometheus metric prefix for default node metrics.
   * Defaults to 'nodejs_'
   */
  metricsPrefix?: string;

  /**
   * Custom bucket thresholds for the HTTP request duration histogram.
   */
  durationBuckets?: number[];

  /**
   * Paths to ignore in HTTP middleware / interceptor metrics & logging (e.g., ['/metrics', '/healthz']).
   */
  ignoredPaths?: string[];

  /**
   * Release version or Git SHA tag (e.g. 'v1.2.0' or 'git-7a8f9b').
   * Auto-detected from process.env.RELEASE or process.env.APP_VERSION or package.json if omitted.
   */
  release?: string;

  /**
   * Optional zero-cost webhook alert configuration (Slack, Discord, generic webhook).
   */
  alerts?: import("./alert-types.js").AlertConfig;

  /**
   * Optional Service Level Objective (SLO) target definition.
   */
  slo?: import("./alert-types.js").SloConfig;

  /**
   * Optional pluggable database adaptor to persist 5xx server crash logs.
   */
  crashLogAdaptor?: CrashLogAdaptor;
}

let activeGlobalConfig: ObservabilityConfig | null = null;

export function setActiveConfig(config: ObservabilityConfig): void {
  activeGlobalConfig = config;
}

export function resetActiveConfig(): void {
  activeGlobalConfig = null;
}

export const getDefaultConfig = (overrides?: Partial<ObservabilityConfig>): ObservabilityConfig => {
  const merged: ObservabilityConfig = {
    serviceName:
      overrides?.serviceName ||
      activeGlobalConfig?.serviceName ||
      process.env.OTEL_SERVICE_NAME ||
      process.env.PROJECT_NAME ||
      "stacklenzz-server",
    environment:
      overrides?.environment ||
      activeGlobalConfig?.environment ||
      process.env.NODE_ENV ||
      "development",
    instanceId:
      overrides?.instanceId ||
      activeGlobalConfig?.instanceId ||
      process.env.EC2_INSTANCE_ID ||
      process.env.HOSTNAME ||
      "local",
    otlpEndpoint:
      overrides?.otlpEndpoint ||
      activeGlobalConfig?.otlpEndpoint ||
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      "http://localhost:4318",
    logLevel:
      overrides?.logLevel ||
      activeGlobalConfig?.logLevel ||
      process.env.LOG_LEVEL ||
      "info",
    enableTracing:
      overrides?.enableTracing !== undefined
        ? overrides.enableTracing
        : activeGlobalConfig?.enableTracing !== undefined
        ? activeGlobalConfig.enableTracing
        : process.env.ENABLE_TRACING !== "false",
    serviceVersion:
      overrides?.serviceVersion ||
      overrides?.release ||
      activeGlobalConfig?.serviceVersion ||
      activeGlobalConfig?.release ||
      process.env.RELEASE ||
      process.env.SERVICE_VERSION ||
      process.env.npm_package_version ||
      "1.0.0",
    metricsPrefix: overrides?.metricsPrefix ?? activeGlobalConfig?.metricsPrefix ?? "nodejs_",
    durationBuckets: overrides?.durationBuckets ?? activeGlobalConfig?.durationBuckets ?? [
      0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
    ],
    release:
      overrides?.release ||
      activeGlobalConfig?.release ||
      process.env.RELEASE ||
      process.env.APP_VERSION ||
      overrides?.serviceVersion ||
      process.env.npm_package_version ||
      "1.0.0",
    alerts: overrides?.alerts || activeGlobalConfig?.alerts,
    slo: overrides?.slo || activeGlobalConfig?.slo,
    crashLogAdaptor: overrides?.crashLogAdaptor || activeGlobalConfig?.crashLogAdaptor,
    ignoredPaths: overrides?.ignoredPaths ?? activeGlobalConfig?.ignoredPaths ?? [
      "/metrics",
      "/api/observability/stats",
      "/favicon.ico"
    ],
  };

  if (overrides && Object.keys(overrides).length > 0) {
    activeGlobalConfig = merged;
  }

  return merged;
};

import packageJson from "../../package.json" with { type: "json" };

/**
 * Package metadata object for @stacklenzz/server
 */
export const pkg = {
  name: packageJson.name,
  version: packageJson.version,
};

/**
 * SDK Version string
 */
export const SDK_VERSION = pkg.version;

