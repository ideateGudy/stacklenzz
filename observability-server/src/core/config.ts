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
   * Optional pluggable database adaptor to persist 5xx server crash logs.
   */
  crashLogAdaptor?: CrashLogAdaptor;
}

export const getDefaultConfig = (overrides?: Partial<ObservabilityConfig>): ObservabilityConfig => {
  return {
    serviceName:
      overrides?.serviceName ||
      process.env.OTEL_SERVICE_NAME ||
      process.env.PROJECT_NAME ||
      "stacklenzz-server",
    environment:
      overrides?.environment ||
      process.env.NODE_ENV ||
      "development",
    instanceId:
      overrides?.instanceId ||
      process.env.EC2_INSTANCE_ID ||
      process.env.HOSTNAME ||
      "local",
    otlpEndpoint:
      overrides?.otlpEndpoint ||
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      "http://localhost:4318",
    logLevel:
      overrides?.logLevel ||
      process.env.LOG_LEVEL ||
      "info",
    enableTracing:
      overrides?.enableTracing !== undefined
        ? overrides.enableTracing
        : process.env.ENABLE_TRACING !== "false",
    serviceVersion:
      overrides?.serviceVersion ||
      process.env.SERVICE_VERSION ||
      "1.0.0",
    metricsPrefix: overrides?.metricsPrefix ?? "nodejs_",
    durationBuckets: overrides?.durationBuckets ?? [
      0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
    ],
    crashLogAdaptor: overrides?.crashLogAdaptor,
    ignoredPaths: overrides?.ignoredPaths ?? [
      "/metrics",
      "/api/observability/stats",
      "/favicon.ico"
    ],
  };
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

