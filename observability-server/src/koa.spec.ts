import { describe, it, expect, vi } from "vitest";
import { koaObservability } from "./koa/index.js";

describe("Koa 1-Line Observability Middleware", () => {
  it("should create Koa middleware and handle request lifecycle", async () => {
    const middleware = koaObservability({ serviceName: "koa-spec-test" });
    expect(typeof middleware).toBe("function");

    const ctx: any = {
      path: "/api/products",
      method: "GET",
      status: 200,
      set: vi.fn(),
    };
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("should serve /metrics endpoint directly on Koa context", async () => {
    const middleware = koaObservability({ serviceName: "koa-metrics-test" });

    const ctx: any = {
      path: "/metrics",
      method: "GET",
      set: vi.fn(),
    };
    const next = vi.fn();

    await middleware(ctx, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.body).toBeDefined();
    expect(typeof ctx.body).toBe("string");
  });
});
