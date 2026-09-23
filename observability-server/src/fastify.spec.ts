import { describe, it, expect } from "vitest";
import { fastifyObservability } from "./fastify/index.js";

describe("Fastify 1-Line Observability Plugin", () => {
  it("should register fastify hooks and Prometheus /metrics and /stats routes", async () => {
    const hooks: Record<string, Function[]> = {};
    const routes: Record<string, Function> = {};

    const mockFastify = {
      addHook: (name: string, fn: Function) => {
        hooks[name] = hooks[name] || [];
        hooks[name].push(fn);
      },
      get: (path: string, fn: Function) => {
        routes[path] = fn;
      },
    };

    await fastifyObservability(mockFastify, { serviceName: "fastify-spec-test" });

    expect(hooks["onRequest"]).toBeDefined();
    expect(hooks["onRequest"].length).toBeGreaterThan(0);
    expect(hooks["onResponse"]).toBeDefined();
    expect(hooks["onResponse"].length).toBeGreaterThan(0);

    expect(routes["/metrics"]).toBeDefined();
    expect(routes["/api/observability/stats"]).toBeDefined();
  });
});
