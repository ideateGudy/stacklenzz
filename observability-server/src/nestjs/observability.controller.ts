import { Controller, Get, Delete, Param, Res, Inject, Optional } from "@nestjs/common";
import { register } from "../core/metrics.js";
import { logger as defaultLogger, getCrashLogAdaptor, getRecentErrors } from "../core/logger.js";
import { getObservabilitySnapshot } from "../core/snapshot.js";
import { OBSERVABILITY_OPTIONS } from "./interfaces.js";
import type { NestObservabilityOptions } from "./interfaces.js";
import type { Logger } from "winston";

@Controller()
export class ObservabilityController {
  private readonly loggerInstance: Logger;

  constructor(
    @Optional()
    @Inject(OBSERVABILITY_OPTIONS)
    private readonly options: NestObservabilityOptions = {}
  ) {
    this.loggerInstance = options.customLogger || defaultLogger;
  }

  @Get("metrics")
  async getMetrics(@Res() res: any): Promise<void> {
    try {
      res.setHeader("Content-Type", register.contentType);
      const metricsData = await register.metrics();
      res.end(metricsData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.loggerInstance.error("Error generating metrics:", { error: errorMessage });
      res.status(500).end(errorMessage);
    }
  }

  @Get("api/observability/stats")
  async getStats(@Res() res: any): Promise<void> {
    try {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      const snapshot = await getObservabilitySnapshot(this.options);
      if (typeof res.json === "function") {
        res.json(snapshot);
      } else {
        res.end(JSON.stringify(snapshot));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.loggerInstance.error("Error generating stats snapshot:", { error: errorMessage });
      res.status(500).end(JSON.stringify({ error: errorMessage }));
    }
  }

  @Get("api/observability/crash-logs")
  async getCrashLogs(@Res() res: any): Promise<void> {
    try {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      const adaptor = getCrashLogAdaptor();
      if (adaptor && typeof adaptor.list === "function") {
        const logs = await adaptor.list();
        const payload = { crashLogs: logs || [] };
        if (typeof res.json === "function") return res.json(payload);
        return res.end(JSON.stringify(payload));
      }

      const fallback = getRecentErrors().filter((e) => !e.statusCode || e.statusCode >= 500);
      const payload = { crashLogs: fallback };
      if (typeof res.json === "function") return res.json(payload);
      return res.end(JSON.stringify(payload));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.loggerInstance.error("Error retrieving crash logs:", { error: errorMessage });
      res.status(500).end(JSON.stringify({ error: errorMessage }));
    }
  }

  @Delete("api/observability/crash-logs/:id")
  async deleteCrashLog(@Param("id") id: string, @Res() res: any): Promise<void> {
    try {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      const adaptor = getCrashLogAdaptor();
      if (adaptor && typeof adaptor.delete === "function") {
        await adaptor.delete(id);
        const payload = { success: true, id };
        if (typeof res.json === "function") return res.json(payload);
        return res.end(JSON.stringify(payload));
      }

      res.status(501).end(
        JSON.stringify({
          error: "Deletion is not supported because the configured database adaptor does not implement delete(id)",
        })
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.loggerInstance.error("Error deleting crash log:", { error: errorMessage });
      res.status(500).end(JSON.stringify({ error: errorMessage }));
    }
  }

  @Delete("api/observability/crash-logs")
  async clearAllCrashLogs(@Res() res: any): Promise<void> {
    try {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      const adaptor = getCrashLogAdaptor();
      if (adaptor && typeof adaptor.clearAll === "function") {
        await adaptor.clearAll();
        const payload = { success: true, cleared: true };
        if (typeof res.json === "function") return res.json(payload);
        return res.end(JSON.stringify(payload));
      }

      res.status(501).end(
        JSON.stringify({
          error: "Clearing all logs is not supported because the configured database adaptor does not implement clearAll()",
        })
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.loggerInstance.error("Error clearing crash logs:", { error: errorMessage });
      res.status(500).end(JSON.stringify({ error: errorMessage }));
    }
  }
}
