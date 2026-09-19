import type { Request, Response, RequestHandler } from "express";
import { register } from "../core/metrics.js";
import { logger as defaultLogger } from "../core/logger.js";
import { getObservabilitySnapshot } from "../core/snapshot.js";
import type { ObservabilityConfig } from "../core/config.js";
import type { Logger } from "winston";

export interface MetricsHandlerOptions {
  customLogger?: Logger;
}

export interface StatsHandlerOptions {
  customLogger?: Logger;
  configOverrides?: Partial<ObservabilityConfig>;
}

/**
 * Creates an Express route handler that serves Prometheus metrics.
 */
export function createMetricsHandler(options: MetricsHandlerOptions = {}): RequestHandler {
  const loggerInstance = options.customLogger || defaultLogger;

  return async (_req: Request, res: Response): Promise<void> => {
    try {
      res.set("Content-Type", register.contentType);
      const metricsData = await register.metrics();
      res.end(metricsData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      loggerInstance.error("Error generating metrics:", { error: errorMessage });
      res.status(500).end(errorMessage);
    }
  };
}

/**
 * Creates an Express route handler that serves live JSON telemetry snapshots for the UI dashboard.
 */
export function createStatsHandler(options: StatsHandlerOptions = {}): RequestHandler {
  const loggerInstance = options.customLogger || defaultLogger;

  return async (_req: Request, res: Response): Promise<void> => {
    try {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      
      const snapshot = await getObservabilitySnapshot(options.configOverrides);
      res.json(snapshot);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      loggerInstance.error("Error generating observability snapshot:", { error: errorMessage });
      res.status(500).json({ error: errorMessage });
    }
  };
}

/**
 * Creates an Express route handler that queries persisted crash logs from the DB adaptor.
 */
export function createCrashLogsHandler(options: StatsHandlerOptions = {}): RequestHandler {
  const loggerInstance = options.customLogger || defaultLogger;

  return async (_req: Request, res: Response): Promise<void> => {
    try {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      const { getCrashLogAdaptor, getRecentErrors } = await import("../core/logger.js");
      const adaptor = getCrashLogAdaptor();
      if (adaptor && typeof adaptor.list === "function") {
        const logs = await adaptor.list();
        res.json({ crashLogs: logs || [] });
        return;
      }

      // Graceful fallback to 5xx errors currently held in memory
      const fallback = getRecentErrors().filter((e) => !e.statusCode || e.statusCode >= 500);
      res.json({ crashLogs: fallback });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      loggerInstance.error("Error retrieving crash logs:", { error: errorMessage });
      res.status(500).json({ error: errorMessage });
    }
  };
}

/**
 * Creates an Express route handler that deletes a single crash log by ID.
 */
export function createCrashLogDeleteHandler(options: StatsHandlerOptions = {}): RequestHandler {
  const loggerInstance = options.customLogger || defaultLogger;

  return async (req: Request, res: Response): Promise<void> => {
    try {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      const { getCrashLogAdaptor } = await import("../core/logger.js");
      const adaptor = getCrashLogAdaptor();
      const id = req.params.id;

      if (!id) {
        res.status(400).json({ error: "Missing crash log ID parameter" });
        return;
      }

      if (adaptor && typeof adaptor.delete === "function") {
        await adaptor.delete(id);
        res.json({ success: true, id });
        return;
      }

      res.status(501).json({
        error: "Deletion is not supported because the configured database adaptor does not implement delete(id)",
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      loggerInstance.error("Error deleting crash log:", { error: errorMessage });
      res.status(500).json({ error: errorMessage });
    }
  };
}

/**
 * Creates an Express route handler that purges all crash logs from the database.
 */
export function createCrashLogsClearHandler(options: StatsHandlerOptions = {}): RequestHandler {
  const loggerInstance = options.customLogger || defaultLogger;

  return async (_req: Request, res: Response): Promise<void> => {
    try {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      const { getCrashLogAdaptor } = await import("../core/logger.js");
      const adaptor = getCrashLogAdaptor();

      if (adaptor && typeof adaptor.clearAll === "function") {
        await adaptor.clearAll();
        res.json({ success: true, cleared: true });
        return;
      }

      res.status(501).json({
        error: "Clearing all logs is not supported because the configured database adaptor does not implement clearAll()",
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      loggerInstance.error("Error clearing crash logs:", { error: errorMessage });
      res.status(500).json({ error: errorMessage });
    }
  };
}
