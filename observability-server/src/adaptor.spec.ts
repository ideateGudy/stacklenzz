import "reflect-metadata";
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import {
  setCrashLogAdaptor,
  getCrashLogAdaptor,
  recordError,
  CrashLogEntry,
  CrashLogAdaptor,
  addBreadcrumb,
} from "./core/logger.js";
import { setupObservability } from "./express/setup.js";
import { ObservabilityModule } from "./nestjs/observability.module.js";

describe("Crash Log DB Adaptor Feature", () => {
  beforeEach(() => {
    // Reset adaptor state before each test
    setCrashLogAdaptor(undefined);
  });

  it("should have no adaptor registered by default (opt-in only)", () => {
    expect(getCrashLogAdaptor()).toBeUndefined();
  });

  it("should trigger adaptor.save only on 5xx errors and include full payload", async () => {
    const savedEntries: CrashLogEntry[] = [];
    const adaptor: CrashLogAdaptor = {
      save: async (entry: CrashLogEntry) => {
        savedEntries.push(entry);
      },
    };

    setCrashLogAdaptor(adaptor);
    expect(getCrashLogAdaptor()).toBe(adaptor);

    addBreadcrumb({
      category: "db",
      message: "SELECT * FROM users WHERE id = 123",
      level: "info",
    });

    recordError({
      message: "Database connection failed",
      stack: "Error: Database connection failed\n    at query (db.ts:42:10)",
      route: "/api/users",
      method: "GET",
      statusCode: 500,
      service: "order-service",
      responseBody: { error: "Internal Server Error" },
      context: {
        headers: { "user-agent": "Vitest/1.0" },
      },
    });

    // Wait for microtask/async dispatch
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(savedEntries.length).toBe(1);
    const entry = savedEntries[0];
    expect(entry.statusCode).toBe(500);
    expect(entry.message).toBe("Database connection failed");
    expect(entry.stack).toContain("db.ts:42:10");
    expect(entry.route).toBe("/api/users");
    expect(entry.method).toBe("GET");
    expect(entry.service).toBe("order-service");
    expect(entry.breadcrumbs).toBeDefined();
    expect(entry.breadcrumbs?.some((b) => b.message.includes("SELECT * FROM users"))).toBe(true);
    expect(entry.context?.headers?.["user-agent"]).toBe("Vitest/1.0");
  });

  it("should trigger adaptor for uncaught exceptions without explicit statusCode (defaults to crash)", async () => {
    const savedEntries: CrashLogEntry[] = [];
    const adaptor: CrashLogAdaptor = {
      save: async (entry: CrashLogEntry) => {
        savedEntries.push(entry);
      },
    };

    setCrashLogAdaptor(adaptor);

    recordError({
      message: "Uncaught fatal crash in worker thread",
      stack: "Error: Uncaught fatal crash\n    at worker.ts:15:5",
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(savedEntries.length).toBe(1);
    expect(savedEntries[0].message).toBe("Uncaught fatal crash in worker thread");
  });

  it("should NOT trigger adaptor on 4xx client errors", async () => {
    const savedEntries: CrashLogEntry[] = [];
    const adaptor: CrashLogAdaptor = {
      save: async (entry: CrashLogEntry) => {
        savedEntries.push(entry);
      },
    };

    setCrashLogAdaptor(adaptor);

    // 400 Bad Request
    recordError({
      message: "Validation failed for email",
      route: "/api/register",
      method: "POST",
      statusCode: 400,
    });

    // 404 Not Found
    recordError({
      message: "User not found",
      route: "/api/users/999",
      method: "GET",
      statusCode: 404,
    });

    // 401 Unauthorized
    recordError({
      message: "Token expired",
      route: "/api/secret",
      method: "GET",
      statusCode: 401,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(savedEntries.length).toBe(0);
  });

  it("should support saveCrashLog method signature", async () => {
    const savedEntries: CrashLogEntry[] = [];
    const adaptor: CrashLogAdaptor = {
      saveCrashLog: async (entry: CrashLogEntry) => {
        savedEntries.push(entry);
      },
    };

    setCrashLogAdaptor(adaptor);

    recordError({
      message: "Gateway timeout upstream",
      statusCode: 504,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(savedEntries.length).toBe(1);
    expect(savedEntries[0].statusCode).toBe(504);
  });

  it("should be non-blocking and never throw if the DB adaptor rejects or throws", async () => {
    const failingAdaptor: CrashLogAdaptor = {
      save: async () => {
        throw new Error("PostgreSQL connection refused: ECONNREFUSED 127.0.0.1:5432");
      },
    };

    setCrashLogAdaptor(failingAdaptor);

    // Must not throw or crash
    expect(() => {
      recordError({
        message: "Critical payment failure",
        statusCode: 503,
      });
    }).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it("should register adaptor via setupObservability in Express", () => {
    const app = express();
    const mockAdaptor: CrashLogAdaptor = {
      save: vi.fn(),
    };

    setupObservability(app, {
      autoInitTracing: false,
      crashLogAdaptor: mockAdaptor,
    });

    expect(getCrashLogAdaptor()).toBe(mockAdaptor);
  });

  it("should register adaptor via ObservabilityModule.forRoot in NestJS", () => {
    const mockAdaptor: CrashLogAdaptor = {
      save: vi.fn(),
    };

    ObservabilityModule.forRoot({
      autoInitTracing: false,
      crashLogAdaptor: mockAdaptor,
    });

    expect(getCrashLogAdaptor()).toBe(mockAdaptor);
  });
});
