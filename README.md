<p align="center">
  <img src="./assets/logo.svg" alt="Stacklenzz Logo" width="80" height="80" />
</p>

<h1 align="center">Stacklenzz</h1>

<p align="center">
  A developer-first backend observability, monitoring, and logging ecosystem for <b>Express</b> and <b>NestJS</b>, paired with a zero-configuration, ready-to-install <b>React & Next.js</b> dashboard UI and CLI.
</p>

<p align="center">
  <a href="https://stacklenzz.vercel.app/"><b>📖 Full Documentation & Interactive Portal: https://stacklenzz.vercel.app/</b></a>
</p>

---

## ⚡️ The Developer Experience

```
1. Instrument Backend (Express or NestJS)
   npm install @stacklenzz/server

2. Add Dashboard to Frontend (Next.js or React + Vite)
   npx stacklenzz dashboard

3. Open Protected Route
   http://localhost:3000/admin/observability
```

---

## 📦 Monorepo Architecture & NPM Packages

This repository contains three standalone, production-ready NPM packages and practical example applications:

| Package | Directory | Description | Documentation |
|---|---|---|---|
| [`@stacklenzz/server`](./observability-server) | `observability-server/` | Full-featured backend SDK for Express & NestJS with OpenTelemetry tracing, Prometheus `/metrics`, Winston logger, rolling error rate windows, and deterministic error fingerprinting | [Read SDK Guide →](./observability-server/README.md) |
| [`@stacklenzz/ui`](./observability-ui) | `observability-ui/` | Modern React/Next.js dashboard suite powered by Redux Toolkit (`@reduxjs/toolkit`), 6 built-in runtime themes with automatic `localStorage` persistence, interactive template switcher, error inspector with breadcrumbs, and latency gauges | [Read UI Guide →](./observability-ui/README.md) |
| [`@stacklenzz/cli`](./observability-cli) | `observability-cli/` | Zero-configuration CLI detecting frameworks and package managers to scaffold dashboards and run `doctor` connectivity diagnostics | [Read CLI Guide →](./observability-cli/README.md) |

---

## 🚀 Backend Integration Guide (`@stacklenzz/server`)

`@stacklenzz/server` provides dedicated, tree-shakable subpath exports tailored to your architecture:
- `@stacklenzz/server/express` (Express setup & middleware)
- `@stacklenzz/server/nestjs` (`ObservabilityModule.forRoot()` & `forRootAsync()`)
- `@stacklenzz/server/core` or `@stacklenzz/server` (Core telemetry, Prometheus metrics, Winston logger, snapshots, and OpenTelemetry)

### 1. Express Setup

```typescript
import express from "express";
import { setupObservability, logger, addBreadcrumb } from "@stacklenzz/server/express";

const app = express();

// Automatically configures:
// - /metrics (Prometheus scrape endpoint)
// - /api/observability/stats (JSON telemetry feed for dashboard UI)
// - OpenTelemetry NodeSDK distributed tracing
// - Winston JSON logging with trace_id / span_id correlation
setupObservability(app, {
  serviceName: "my-express-api",
  environment: "production",
  statsPath: "/api/observability/stats", // default
  metricsPath: "/metrics",              // default
  // Optional: Pluggable DB Adaptor for 5xx Server Crashes
  crashLogAdaptor: {
    save: async (entry) => {
      // Persist 5xx crash logs to Postgres, MongoDB, Prisma, etc.
      await db.crashLogs.insert(entry);
    },
  },
});

app.get("/api/users", (req, res) => {
  addBreadcrumb({ category: "http", message: "Fetching active users", level: "info" });
  res.json([{ id: 1, name: "Alice" }]);
});

// Fallback for non-existent routes (automatically captured as 404 in dashboard)
app.use((req, res) => {
  res.status(404).json({ statusCode: 404, error: "Not Found", message: `Cannot ${req.method} ${req.url}` });
});

app.listen(5000, () => console.log("Express API on http://localhost:5000"));
```

### 2. NestJS Setup

In `app.module.ts`:
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

Async configuration with `ConfigService`:
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
        serviceName: config.get<string>("SERVICE_NAME", "my-nestjs-api"),
        environment: config.get<string>("NODE_ENV", "production"),
      }),
    }),
  ],
})
export class AppModule {}
```

In `main.ts` (enable CORS so frontend dashboards can fetch stats):
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

### 3. Other Node.js Frameworks & Background Services (`@stacklenzz/server/core`)

If you are using **Fastify**, **Koa**, **Hono**, **Hapi**, a pure Node `http` server, or background queues (BullMQ, Kafka, RabbitMQ), you can use `@stacklenzz/server/core` to record metrics, capture errors, and serve the `/api/observability/stats` endpoint:

#### Fastify Example:
```typescript
import Fastify from "fastify";
import { getObservabilitySnapshot, recordError, addBreadcrumb, logger } from "@stacklenzz/server/core";

const fastify = Fastify({ logger: false });

// 1. Expose the telemetry stats endpoint for @stacklenzz/ui dashboards
fastify.get("/api/observability/stats", async (request, reply) => {
  const snapshot = await getObservabilitySnapshot();
  return reply.header("Access-Control-Allow-Origin", "*").send(snapshot);
});

// 2. Global error hook to capture issues into the dashboard
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

#### Koa Example:
```typescript
import Koa from "koa";
import Router from "@koa/router";
import { getObservabilitySnapshot, recordError } from "@stacklenzz/server/core";

const app = new Koa();
const router = new Router();

// Observability stats endpoint for dashboard UI
router.get("/api/observability/stats", async (ctx) => {
  ctx.set("Access-Control-Allow-Origin", "*");
  ctx.body = await getObservabilitySnapshot();
});

// Middleware for error tracking
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

#### Background Workers, Crons & Microservices:
```typescript
import {
  getObservabilitySnapshot,
  Counter,
  Gauge,
  register,
  logger,
  addBreadcrumb,
  trace,
} from "@stacklenzz/server/core";

// Record breadcrumbs leading up to events
addBreadcrumb({ category: "db", message: "Executing order payment", level: "info" });

// Custom Prometheus business metric
const checkoutCounter = new Counter({
  name: "orders_processed_total",
  help: "Total processed checkout orders",
  registers: [register],
});
checkoutCounter.inc();

// Retrieve instantaneous operational telemetry snapshot
const snapshot = await getObservabilitySnapshot();
console.log("Current Error Rate (%):", snapshot.summary.errorRate);
console.log("Active Requests:", snapshot.summary.activeRequests);
```

### 💾 Pluggable Database Crash Log Adaptor (`crashLogAdaptor`)

Persist 5xx server crashes directly to your database (PostgreSQL, MongoDB, Redis, Prisma, TypeORM, etc.).

- **Opt-in Only**: Zero setup overhead if omitted.
- **5xx / Crash Trigger Only**: Fires only for 5xx errors or uncaught server exceptions (4xx client errors and info logs are excluded).
- **Non-Blocking Fire-and-Forget**: Runs asynchronously so database latency or outages never impact client HTTP response times.

```typescript
import { setupObservability, CrashLogEntry } from "@stacklenzz/server";

setupObservability(app, {
  serviceName: "payment-service",
  crashLogAdaptor: {
    save: async (entry: CrashLogEntry) => {
      // Save entry to your database table / collection
      await db.crashLogs.create({
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

---

## 🖥 Frontend Setup (`@stacklenzz/ui`)

### Option A: Using the CLI (Recommended)

Run inside your Next.js or React project:
```bash
npx stacklenzz dashboard
```
The CLI detects whether you are using **Next.js (App Router / Pages Router)** or **Vite/React**, installs the dependencies, and generates the dashboard route at `/admin/observability`.

### Option B: Manual Integration

Install the UI package:
```bash
npm install @stacklenzz/ui lucide-react @reduxjs/toolkit react-redux
```

Create your page (e.g. Next.js App Router `app/admin/observability/page.tsx`):
```tsx
"use client";

import { ObservabilityDashboard } from "@stacklenzz/ui";

export default function AdminObservabilityPage() {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "transparent" }}>
      <ObservabilityDashboard
        config={{
          endpoint: process.env.NEXT_PUBLIC_OBSERVABILITY_URL || "http://localhost:5000/api/observability/stats",
          refreshIntervalMs: 5000,
        }}
        defaultDashboard="full"
        showSwitcher={true}
      />
    </main>
  );
}
```

---

## 🩺 System Health Diagnostics (`doctor`)

Verify your environment, framework, and test your backend telemetry connection at any time:

```bash
npx stacklenzz doctor
```

```
🩺 Stacklenzz CLI - System & Health Doctor

✓ Node.js runtime: v24.10.0 (compatible >= 18)
✓ Package manager: npm
✓ Frontend framework: next-app (TypeScript)
✓ Stacklenzz UI: Installed
✓ Telemetry endpoint reachable! HTTP 200 (69ms)
   Backend service: my-nestjs-api [production]
   Requests recorded: 14,291
```

---

## 🎨 Available Dashboard Templates & 6 Runtime Themes

### 6 Pre-Composed Dashboard Templates
`@stacklenzz/ui` includes 6 distinct dashboard views with an interactive switcher:

1. **Universal Console** (`<ObservabilityDashboard />`): Master template featuring the integrated dashboard switcher and theme dropdown picker.
2. **Full Suite** (`<FullBackendDashboard />`): Key metric cards, HTTP status distribution, latency gauges, runtime resources, top endpoints, and live error inspector.
3. **API Overview** (`<ApiOverviewDashboard />`): High-level traffic rates, status breakdown, active requests, and endpoint volume.
4. **Backend Performance** (`<BackendPerformanceDashboard />`): P50, P95, and P99 latency percentiles and route response times.
5. **Error Monitoring** (`<ErrorMonitoringDashboard />`): Incident & error tracking with 4xx/5xx filters, fingerprint aggregation, occurrence count (`x4` ➔ `x2` by window), and event breadcrumbs.
6. **Node Runtime** (`<NodeRuntimeDashboard />`): Process CPU load, RSS/Heap memory usage, and V8 event loop lag.
7. **Minimal Widget** (`<MinimalDashboard />`): Compact card designed to be embedded in an existing admin layout.

### 6 Built-In Runtime Themes
All dashboard components adapt automatically to the active theme with zero CSS configuration required:
- **Tokyo Night** (`tokyo-night`) - Deep indigo with neon accents *(Default)*
- **Nord** (`nord`) - Arctic cool frost blues
- **Dracula** (`dracula`) - Vibrant purple and pink accents
- **Catppuccin Mocha** (`catppuccin`) - Soothing pastel dark palette
- **Emerald Terminal** (`emerald-terminal`) - High-contrast matrix terminal green
- **Cyberpunk** (`cyberpunk`) - High-energy neon pink and cyan

> **Persistence**: Theme selections automatically persist to `localStorage` under key `stacklenzz_theme` across page reloads and route navigation.

---

## 🔒 Security & Admin Authorization

Because the dashboard displays live backend requests, route timings, and error payloads, **ensure this route is protected behind your authentication and authorization layer**.

### Next.js Middleware Example (`middleware.ts`):
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin/observability")) {
    const token = req.cookies.get("admin_token");
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
  return NextResponse.next();
}
```

---

## 📁 Working Examples in this Repository

| Example | Directory | Port | Description |
|---|---|---|---|
| **Express API** | [`examples/express-api`](./examples/express-api) | `5000` | Express server instrumented with `setupObservability` |
| **NestJS API** | [`examples/nestjs-api`](./examples/nestjs-api) | `5000` | NestJS app instrumented with `ObservabilityModule` |
| **Next.js Docs & Portal** | [`examples/nextjs-docs`](./examples/nextjs-docs) | `3000` | Next.js 16 App Router interactive documentation & admin portal |
| **React + Vite** | [`examples/react-vite`](./examples/react-vite) | `5173` | React 19 + Vite dashboard application |

---

## 🛠 Building, Testing & Contributing

```bash
# Install root dependencies
npm install

# Run automated tests across all 3 packages
npm test

# Or run tests per package:
npm run test:server   # observability-server (12 unit tests)
npm run test:ui       # observability-ui (13 unit tests)
npm run test:cli      # observability-cli (5 unit tests)

# Build all packages simultaneously
npm run build

# Or build individual packages:
npm run build:server  # observability-server
npm run build:ui      # observability-ui
npm run build:cli     # observability-cli

# Inspect package tarballs before publishing (dry-run mode):
npm run pack:server   # Dry-run tarball for @stacklenzz/server
npm run pack:ui       # Dry-run tarball for @stacklenzz/ui
npm run pack:cli      # Dry-run tarball for @stacklenzz/cli
npm run pack:all      # Dry-run tarball for all 3 packages

# Version management:
npm run version:server patch  # Bump backend server SDK
npm run version:ui patch      # Bump UI package
npm run version:cli patch     # Bump CLI package
# Publish packages individually:
npm run publish:server       # Publish @stacklenzz/server
npm run publish:ui           # Publish @stacklenzz/ui
npm run publish:cli          # Publish @stacklenzz/cli

# Safely build, test, and publish all packages together:
npm run publish:all
```

---

## 🤝 Contributing

We welcome contributions from the community! Whether you are fixing bugs, adding new features, improving documentation, or creating new dashboard components, your input is appreciated.

1. **Fork the Repository**: Create your feature branch (`git checkout -b feature/amazing-feature`).
2. **Setup Workspace**: Run `npm install` at the root to install all workspace dependencies.
3. **Run Tests**: Execute `npm test` to run tests across `@stacklenzz/server`, `@stacklenzz/ui`, and `@stacklenzz/cli`.
4. **Commit Changes**: Use conventional commit messages (`git commit -m 'feat: add amazing feature'`).
5. **Submit a PR**: Push to your branch and open a Pull Request.

- **Documentation Website Repo:** [https://github.com/ideateGudy/stacklenzz-docs](https://github.com/ideateGudy/stacklenzz-docs)

For complete guides and live interactive documentation, visit **[stacklenzz.vercel.app](https://stacklenzz.vercel.app/)**.

---

## 📄 License

MIT © Goodnews Azonubi
