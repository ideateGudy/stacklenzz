<p align="center">
  <img src="./assets/logo.svg" alt="Stacklenzz Logo" width="80" height="80" />
</p>

<h1 align="center">@stacklenzz/server</h1>

<p align="center">
  A comprehensive, production-ready observability and monitoring package for <b>Node.js</b>, <b>Express</b>, and <b>NestJS</b> applications with full <b>TypeScript</b> support.
</p>

<p align="center">
  <a href="https://stacklenzz.vercel.app/"><b>📖 Full Documentation & Interactive Portal: https://stacklenzz.vercel.app/</b></a>
</p>

It provides:
- **Zero-Config Telemetry Endpoint** (`/api/observability/stats`) feeding real-time operations into frontend dashboards.
- **Built-in Error Intelligence**:
  - Automatic 4xx & 5xx error capture with stack traces and request context (OS, Node version, memory, IP, user-agent, query params).
  - Deterministic fingerprinting to automatically group recurring issues and track occurrences.
  - Event breadcrumbs (`addBreadcrumb`, `getBreadcrumbs`) recording HTTP requests, DB queries, and logs leading up to an error.
- **Sliding Window Error Rates & Counters**: Rolling time windows (`last1m`, `last5m`, `last15m`, `last30m`, `last1h`, `last2h`, `last24h`, `last7d`, `last30d`).
- **Prometheus Metrics**: Standard Node.js runtime metrics (CPU, RSS, Heap, Event Loop lag) + HTTP request counters, histograms, and active request gauges via `@prometheus-io/client` on `/metrics`.
- **OpenTelemetry Distributed Tracing**: Auto-instrumentations + OTLP trace exporter with Winston trace correlation (`trace_id` and `span_id`).
- **Clean Subpath Exports**:
  - `@stacklenzz/server` (core)
  - `@stacklenzz/server/express`
  - `@stacklenzz/server/nestjs`

---

## Installation

```bash
npm install @stacklenzz/server
# or
pnpm add @stacklenzz/server
```

### Peer Dependencies:
- **Express**: `npm install express`
- **NestJS**: `npm install @nestjs/common @nestjs/core @nestjs/platform-express rxjs reflect-metadata`

---

## Package Subpath Exports

`@stacklenzz/server` is organized into clean, modern subpath exports:

| Subpath | Purpose | Key Exports |
|---|---|---|
| `@stacklenzz/server/express` | Express.js framework integration | `setupObservability`, `createObservabilityMiddleware`, `createMetricsHandler`, `createStatsHandler` |
| `@stacklenzz/server/nestjs` | NestJS framework integration | `ObservabilityModule`, `ObservabilityInterceptor`, `ObservabilityExceptionFilter` |
| `@stacklenzz/server/core` | Core telemetry, metrics, Winston logger & snapshots | `getObservabilitySnapshot`, `Counter`, `Gauge`, `register`, `logger`, `addBreadcrumb`, `trace`, `context`, `resetMetrics` |
| `@stacklenzz/server` | Default root export | Re-exports all core primitives + Express utilities |

---

## Quick Start: Express (`@stacklenzz/server/express`)

Instrument your Express application with a single call:

```typescript
import express from "express";
import { setupObservability } from "@stacklenzz/server/express";
import { logger, addBreadcrumb } from "@stacklenzz/server/core";

const app = express();

// Automatically attaches Prometheus /metrics, Winston logging, and /api/observability/stats
setupObservability(app, {
  serviceName: "my-express-api",
  environment: "production",
  statsPath: "/api/observability/stats", // default
  metricsPath: "/metrics",              // default
});

app.get("/api/users", (req, res) => {
  // Add breadcrumbs for key operations
  addBreadcrumb({ category: "auth", message: "User authenticated", level: "info" });
  res.json([{ id: 1, name: "Alice" }]);
});

// Fallback for non-existent routes (automatically tracked as 404 in dashboard)
app.use((req, res) => {
  res.status(404).json({ statusCode: 404, error: "Not Found", message: `Cannot ${req.method} ${req.url}` });
});

app.listen(5000, () => console.log("API running on port 5000"));
```

---

## Quick Start: NestJS (`@stacklenzz/server/nestjs`)

### Synchronous Setup:
In your root module (`app.module.ts`):

```typescript
import { Module } from "@nestjs/common";
import { ObservabilityModule } from "@stacklenzz/server/nestjs";

@Module({
  imports: [
    ObservabilityModule.forRoot({
      serviceName: "my-nestjs-api",
      environment: "production",
      autoInitTracing: true,
    }),
  ],
})
export class AppModule {}
```

### Asynchronous Setup with `ConfigService`:
```typescript
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ObservabilityModule } from "@stacklenzz/server/nestjs";

@Module({
  imports: [
    ConfigModule.forRoot(),
    ObservabilityModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        serviceName: config.get<string>("APP_NAME", "my-nestjs-api"),
        environment: config.get<string>("NODE_ENV", "production"),
      }),
    }),
  ],
})
export class AppModule {}
```

In your `main.ts`, enable CORS so your frontend dashboard can read telemetry:

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: "*" });
  await app.listen(5000);
}
bootstrap();
```

> **Note**: `ObservabilityModule.forRoot()` automatically registers both `ObservabilityInterceptor` (for request metrics and timing) and `ObservabilityExceptionFilter` (for global 404, 4xx, and 5xx error captures).

---

## Node.js Framework Compatibility (Fastify, Koa, Hono, Hapi, Pure Node)

`@stacklenzz/server` is framework-agnostic at its core. If you are using frameworks other than Express or NestJS, you can import `@stacklenzz/server/core` to wire up telemetry, error recording, and your snapshot endpoint:

### 1. Fastify Integration
```typescript
import Fastify from "fastify";
import { getObservabilitySnapshot, recordError, addBreadcrumb, logger } from "@stacklenzz/server/core";

const fastify = Fastify({ logger: false });

// Expose telemetry snapshot endpoint for @stacklenzz/ui
fastify.get("/api/observability/stats", async (request, reply) => {
  const snapshot = await getObservabilitySnapshot();
  return reply.header("Access-Control-Allow-Origin", "*").send(snapshot);
});

// Fastify error handler capturing failure details into dashboard
fastify.setErrorHandler((error, request, reply) => {
  recordError({
    message: error.message,
    stack: error.stack,
    route: request.url,
    method: request.method,
    statusCode: error.statusCode || 500,
  });
  reply.status(error.statusCode || 500).send({ error: error.message });
});
```

### 2. Koa Integration
```typescript
import Koa from "koa";
import Router from "@koa/router";
import { getObservabilitySnapshot, recordError } from "@stacklenzz/server/core";

const app = new Koa();
const router = new Router();

// Stats endpoint
router.get("/api/observability/stats", async (ctx) => {
  ctx.set("Access-Control-Allow-Origin", "*");
  ctx.body = await getObservabilitySnapshot();
});

// Error tracking middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err: any) {
    recordError({
      message: err.message,
      stack: err.stack,
      route: ctx.path,
      method: ctx.method,
      statusCode: err.status || 500,
    });
    throw err;
  }
});

app.use(router.routes());
```

### 3. Hono (Node.js Adapter)
```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { getObservabilitySnapshot, recordError } from "@stacklenzz/server/core";

const app = new Hono();

app.get("/api/observability/stats", async (c) => {
  c.header("Access-Control-Allow-Origin", "*");
  const snapshot = await getObservabilitySnapshot();
  return c.json(snapshot);
});

app.onError((err, c) => {
  recordError({
    message: err.message,
    stack: err.stack,
    route: c.req.path,
    method: c.req.method,
    statusCode: 500,
  });
  return c.text("Internal Server Error", 500);
});

serve(app, (info) => console.log(`Listening on http://localhost:${info.port}`));
```

---

## Pluggable Database Crash Log Adaptor (`crashLogAdaptor`)

Persist 5xx server crashes directly to a database of your choice (PostgreSQL, MongoDB, Redis, Prisma, TypeORM, etc.).

- **Opt-in Only**: If omitted, standard in-memory ring buffers function with zero overhead.
- **5xx / Crash Trigger Only**: Fires only for 5xx HTTP responses or uncaught server crashes (4xx client errors and info logs are excluded).
- **Non-Blocking Fire-and-Forget**: Executes asynchronously so database write latency or outages never slow down or crash client HTTP requests.

### Configuration via Express:
```typescript
import express from "express";
import { setupObservability, CrashLogEntry } from "@stacklenzz/server";

const app = express();

setupObservability(app, {
  serviceName: "user-service",
  crashLogAdaptor: {
    save: async (entry: CrashLogEntry) => {
      // Save 5xx crash log to PostgreSQL / Prisma
      await prisma.crashLog.create({
        data: {
          id: entry.id,
          timestamp: new Date(entry.timestamp),
          message: entry.message,
          stack: entry.stack,
          route: entry.route,
          method: entry.method,
          statusCode: entry.statusCode,
          breadcrumbs: entry.breadcrumbs,
          context: entry.context,
        },
      });
    },
  },
});
```

### Configuration via NestJS:
```typescript
import { Module } from "@nestjs/common";
import { ObservabilityModule } from "@stacklenzz/server/nestjs";

@Module({
  imports: [
    ObservabilityModule.forRoot({
      serviceName: "user-service",
      crashLogAdaptor: {
        save: async (entry) => {
          await db.crashLogs.insert(entry);
        },
      },
    }),
  ],
})
export class AppModule {}
```

---

## Telemetry & Incident Intelligence Features

### 1. Adding Breadcrumbs
Trace operations leading up to unexpected errors:

```typescript
import { addBreadcrumb } from "@stacklenzz/server";

addBreadcrumb({
  category: "db",
  message: "Query executed on users table",
  level: "info",
  data: { queryTimeMs: 4.2 },
});
```

### 2. Structured & Automatic Error Logging
Logs automatically correlate with active OpenTelemetry spans and are captured into the recent error stream if level is `error`.

#### Automatic Error Logging (`logger.error(err)`):
You **do not** need to manually pass `route`, `method`, `status`, or `stack`. Passing the `Error` instance directly extracts `message` and `stack` while request metadata is captured automatically:

```typescript
import { logger } from "@stacklenzz/server";

try {
  throw new Error("Payment gateway connection reset");
} catch (err) {
  // Automatically captures error message and full stack trace!
  logger.error(err);
}
```

#### Manual Additional Context:
You can also pass custom metadata or response payloads:

```typescript
logger.error("Payment authorization failed", {
  responseBody: { reason: "Gateway timeout" },
});
```

---

## Advanced SDK Utilities

### 1. Programmatic Telemetry Snapshot (`getObservabilitySnapshot`)
Generate an operational JSON snapshot directly in your backend code without an HTTP request:

```typescript
import { getObservabilitySnapshot } from "@stacklenzz/server";

const snapshot = await getObservabilitySnapshot();
console.log("Current Error Rate:", snapshot.summary.errorRate);
console.log("Top Endpoints:", snapshot.http.topEndpoints);
```

### 2. Custom Prometheus Metrics (`Counter`, `Gauge`, `register`)
Register custom business metrics directly on the `/metrics` endpoint:

```typescript
import { Counter, register } from "@stacklenzz/server";

const ordersCounter = new Counter({
  name: "orders_processed_total",
  help: "Total processed checkout orders",
  registers: [register],
});

ordersCounter.inc();
```

### 3. OpenTelemetry API Re-exports (`trace`, `context`)
Access OpenTelemetry tracing primitives directly without installing `@opentelemetry/api`:

```typescript
import { trace, context } from "@stacklenzz/server";

const activeSpan = trace.getSpan(context.active());
if (activeSpan) {
  console.log("Trace ID:", activeSpan.spanContext().traceId);
}
```

### 4. Test Metric Resets (`resetMetrics`)
Clear sliding window buffers and Prometheus counters between test suite runs:

```typescript
import { resetMetrics } from "@stacklenzz/server";

beforeEach(() => {
  resetMetrics();
});
```

---

## Exposed Endpoints

| Endpoint | Method | Format | Purpose |
|---|---|---|---|
| `/api/observability/stats` | `GET` | JSON | Feeds real-time operational state, rolling error rates, runtime health, and error lists to the UI |
| `/metrics` | `GET` | Plaintext | Standard Prometheus scraper endpoint |

---

## Configuration Options

```typescript
interface ObservabilityConfig {
  serviceName?: string;       // default: "stacklenzz-server"
  environment?: string;       // default: "development"
  instanceId?: string;        // default: "local"
  metricsPath?: string;       // default: "/metrics"
  logLevel?: string;          // default: "info"
  autoInitTracing?: boolean;  // default: true
  ignoredPaths?: string[];    // default: ["/metrics", "/healthz", "/health"]
}
```

---

## 🤝 Contributing & Documentation

Contributions are welcome! Please visit the official **[Stacklenzz Documentation Portal](https://stacklenzz.vercel.app/)** to explore setup guides, architecture overviews, and usage examples.

To report bugs or contribute code:
1. Open an issue or Pull Request on GitHub.
2. Ensure unit tests pass (`npm run test:server`).

---

## License
MIT © Goodnews Azonubi
