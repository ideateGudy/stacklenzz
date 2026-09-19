import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from "@nestjs/common";
import { OBSERVABILITY_OPTIONS } from "./interfaces.js";
import type { NestObservabilityOptions } from "./interfaces.js";
import { logger as defaultLogger, addBreadcrumb, setCrashLogAdaptor } from "../core/logger.js";
import { recordRequestEvent } from "../core/metrics.js";
import type { Logger } from "winston";

/**
 * Global Exception Filter that captures ANY unhandled exception in NestJS,
 * including 404 Not Found (e.g. routes that do not exist), 4xx Client Errors, and 5xx Server Errors.
 */
@Catch()
export class ObservabilityExceptionFilter implements ExceptionFilter {
  private readonly loggerInstance: Logger;

  constructor(
    @Optional()
    @Inject(OBSERVABILITY_OPTIONS)
    private readonly options: NestObservabilityOptions = {}
  ) {
    this.loggerInstance = options.customLogger || defaultLogger;
    if (options.crashLogAdaptor) {
      setCrashLogAdaptor(options.crashLogAdaptor);
    }
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      typeof (exception as any)?.getStatus === "function"
        ? (exception as any).getStatus()
        : ((exception as any)?.status || (exception as any)?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR);

    const errorResponse =
      typeof (exception as any)?.getResponse === "function"
        ? (exception as any).getResponse()
        : {
            statusCode: status,
            message:
              exception instanceof Error
                ? exception.message
                : "Internal Server Error",
          };

    const route =
      (request.baseUrl || "") +
      (request.route?.path || request.url || request.raw?.url || "unknown");

    const message =
      typeof errorResponse === "object" && errorResponse !== null
        ? (errorResponse as any).message || JSON.stringify(errorResponse)
        : String(errorResponse);

    // Record breadcrumb
    addBreadcrumb({
      category: "http",
      message: `${request.method} ${request.originalUrl || request.url} -> ${status}`,
      level: status >= 500 ? "error" : "warn",
      data: {
        url: request.originalUrl || request.url,
        statusCode: status,
      },
    });

    // Record error in logger
    const logData = {
      method: request.method,
      url: request.originalUrl || request.url,
      route,
      status,
      responseBody: errorResponse,
      context: {
        headers: {
          "user-agent": request.headers?.["user-agent"],
          host: request.headers?.["host"],
          "content-type": request.headers?.["content-type"],
        },
        query: request.query,
        ip: request.ip || request.socket?.remoteAddress,
      },
    };

    if (status >= 500) {
      this.loggerInstance.error(
        `HTTP Server Error (${status}) on ${request.method} ${request.originalUrl || request.url}: ${message}`,
        {
          ...logData,
          stack: exception instanceof Error ? exception.stack : undefined,
          isMiddlewareSummary: true,
        }
      );
    } else {
      this.loggerInstance.error(
        `HTTP Client Error (${status}) on ${request.method} ${request.originalUrl || request.url}: ${message}`,
        {
          ...logData,
          isMiddlewareSummary: true,
        }
      );
    }

    // Send the response to client
    if (typeof response.status === "function") {
      response.status(status).json(
        typeof errorResponse === "object"
          ? errorResponse
          : { statusCode: status, message: errorResponse }
      );
    } else if (typeof response.writeHead === "function") {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(errorResponse));
    }
  }
}
