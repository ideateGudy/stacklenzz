import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { setupObservability, logger, addBreadcrumb, CapturedErrorRecord, trackJob, trackDatabaseQuery } from "@stacklenzz/server";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL;

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
}

const products: Product[] = [
  {
    id: 1,
    name: "Cloud Server Pro",
    price: 49,
    category: "Infrastructure",
    description: "High-performance cloud server for demanding applications.",
  },
  {
    id: 2,
    name: "Managed Database",
    price: 99,
    category: "Infrastructure",
    description: "Managed PostgreSQL database instance with auto-scaling.",
  },
];

// Initialize PostgreSQL Connection Pool (supports Neon PostgreSQL)
let pool: pg.Pool | null = null;

if (DATABASE_URL && !DATABASE_URL.includes("your_password")) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("neon.tech") || DATABASE_URL.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : false,
  });

  // Verify connection and create crash_logs table automatically
  pool
    .query(
      `CREATE TABLE IF NOT EXISTS crash_logs (
        id VARCHAR(255) PRIMARY KEY,
        timestamp VARCHAR(255) NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        environment VARCHAR(255) NOT NULL,
        error_name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        route VARCHAR(255),
        method VARCHAR(255),
        status_code INT,
        fingerprint VARCHAR(255),
        occurrences INT DEFAULT 1,
        breadcrumbs JSONB DEFAULT '[]'::jsonb,
        context JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`
    )
    .then(() => console.log("🌱 [Express API] Connected to PostgreSQL (Neon) for persistent 5xx crash logging"))
    .catch((err: Error) => console.error("⚠️ [Express API] PostgreSQL Connection Error:", err.message));
} else {
  console.warn("⚠️ [Express API] DATABASE_URL is missing or unconfigured in process.env! Update your .env file with your Neon PostgreSQL URL.");
}

// One-liner attaches:
// 1. Request latency & throughput monitoring
// 2. Prometheus metrics at /metrics
// 3. Telemetry JSON snapshot at /api/observability/stats for the UI dashboard
// 4. Pluggable PostgreSQL (Neon) crash log adaptor for persistent 5xx failures
setupObservability(app, {
  serviceName: "bookme-express-api",
  environment: "development",
  release: "v1.2.4",
  autoInitTracing: false,
  slo: {
    availabilityTarget: 99.5,
    periodDays: 30,
  },
  alerts: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    errorRateThreshold: 5,
    cooldownMinutes: 1, // 1 minute smart cooldown per error condition
    alertOn5xxCrash: true, // Fire message on 5xx server crash
  },
  crashLogAdaptor: {
    async save(errorLog: CapturedErrorRecord): Promise<void> {
      if (!pool) return;
      console.log("💾 [PostgreSQL Adaptor] Persisting 5xx crash log:", errorLog.id);
      await pool.query(
        `INSERT INTO crash_logs (id, timestamp, service_name, environment, error_name, message, stack, route, method, status_code, fingerprint, occurrences, breadcrumbs, context)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
           occurrences = EXCLUDED.occurrences,
           timestamp = EXCLUDED.timestamp,
           breadcrumbs = EXCLUDED.breadcrumbs,
           context = EXCLUDED.context;`,
        [
          errorLog.id,
          String(errorLog.timestamp || Date.now()),
          errorLog.service || "bookme-express-api",
          "development",
          errorLog.message ? errorLog.message.split(":")[0] : "Error",
          errorLog.message,
          errorLog.stack || "",
          errorLog.route || "",
          errorLog.method || "",
          errorLog.statusCode || 500,
          errorLog.fingerprint || "",
          errorLog.occurrences || 1,
          JSON.stringify(errorLog.breadcrumbs || []),
          JSON.stringify(errorLog.context || {}),
        ]
      );
    },
    async list(): Promise<any[]> {
      if (!pool) return [];
      const { rows } = await pool.query(`SELECT * FROM crash_logs ORDER BY created_at DESC`);
      return rows.map((r: any) => ({
        id: r.id,
        timestamp: r.timestamp,
        serviceName: r.service_name,
        environment: r.environment,
        errorName: r.error_name,
        message: r.message,
        stack: r.stack,
        route: r.route,
        method: r.method,
        statusCode: r.status_code,
        fingerprint: r.fingerprint,
        occurrences: r.occurrences,
        breadcrumbs: typeof r.breadcrumbs === "string" ? JSON.parse(r.breadcrumbs) : (r.breadcrumbs || []),
        context: typeof r.context === "string" ? JSON.parse(r.context) : (r.context || {}),
        createdAt: r.created_at,
      }));
    },
    async delete(id: string): Promise<void> {
      if (!pool) return;
      await pool.query(`DELETE FROM crash_logs WHERE id = $1`, [id]);
    },
    async clearAll(): Promise<void> {
      if (!pool) return;
      await pool.query(`DELETE FROM crash_logs`);
    },
  },
});

app.use(express.json());

// Sample business routes
app.get("/api/users", async (_req: Request, res: Response) => {
  logger.info("Users fetched successfully");
  const users = await trackDatabaseQuery("SELECT * FROM users WHERE active = true", async () => {
    // Simulate query execution time
    await new Promise((r) => setTimeout(r, 12));
    return [
      { id: 1, name: "Alice Developer", role: "admin" },
      { id: 2, name: "Bob Engineer", role: "member" },
    ];
  });
  res.json(users);
});

app.post("/api/login", (req: Request, res: Response) => {
  const { username } = req.body || {};
  logger.info("User login attempt", { username });
  res.json({ success: true, token: "demo-jwt-token" });
});

app.get("/api/products", (_req: Request, res: Response) => {
  res.json(products);
});

app.get("/api/products/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const product = products.find((p) => p.id === Number(id));
  if (!product) {
    logger.error("Product not found", {
      route: "/api/products/:id",
      method: "GET",
      statusCode: 404,
      productId: id,
    });
    return res.status(404).json({ message: "Product not found" });
  }
  res.json(product);
});

app.post("/api/orders", (_req: Request, res: Response) => {
  const isError = Math.random() < 0.2;
  if (isError) {
    logger.error("Payment processing error occurred", {
      route: "/api/orders",
      method: "POST",
      statusCode: 500,
    });
    return res.status(500).json({ error: "Payment processor unavailable" });
  }
  res.status(201).json({ orderId: "ORD-9821", status: "completed" });
});

// Dedicated endpoints to trigger and test Recent Exceptions & Failures:

// 1. Trigger simulated database failure with stack trace
app.get("/api/simulate-error", (_req: Request, res: Response) => {
  addBreadcrumb({ category: "auth", message: "User session authenticated: uid_4812", level: "info" });
  addBreadcrumb({ category: "db", message: "Attempting query: SELECT * FROM `users` WHERE active = true", level: "info" });
  addBreadcrumb({ category: "db", message: "Database connection pool timeout warning (limit: 10 connections)", level: "warn" });

  try {
    throw new Error("DatabaseConnectionTimeout: Connection pool exhausted after 3000ms while querying `users` table");
  } catch (err: any) {
    logger.error(err.message, {
      stack: err.stack,
      route: "/api/simulate-error",
      method: "GET",
      status: 500,
    });
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
      hint: "Inspect this failure live in the Observability Dashboard under 'Recent Exceptions & Failures'!",
    });
  }
});

// 2. Trigger simulated payment gateway 502 Bad Gateway
app.post("/api/simulate-crash", (req: Request, res: Response) => {
  addBreadcrumb({ category: "auth", message: "User checkout initiated (cart_id: crt_8820)", level: "info" });
  addBreadcrumb({ category: "http", message: "Outbound POST https://api.stripe.com/v1/payment_intents", level: "info" });
  addBreadcrumb({ category: "log", message: "Stripe connection socket reset by peer (ECONNRESET)", level: "error" });

  const customErr = new Error("UpstreamGatewayUnavailable: Stripe charge API returned HTTP 502 Bad Gateway");
  logger.error(customErr.message, {
    stack: customErr.stack,
    route: "/api/simulate-crash",
    method: "POST",
    status: 502,
    req,
  });
  res.status(502).json({
    gateway: "stripe-v1",
  });
});

// 3. Trigger simulated background job using trackJob
app.post("/api/trigger-job", async (req: Request, res: Response) => {
  const { jobName = "email-digest", queueName = "notifications" } = req.body || {};
  
  const result = await trackJob(
    jobName,
    async () => {
      // Simulate background worker processing time
      await new Promise((resolve) => setTimeout(resolve, 350));
      return { processed: 42, recipientGroup: "active_subscribers" };
    },
    { queue: queueName }
  );

  res.json({
    message: "Background job tracked successfully",
    result,
  });
});

// Fallback for non-existent routes (404 Not Found)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    statusCode: 404,
    error: "Not Found",
    message: `Cannot ${req.method} ${req.originalUrl || req.url}`,
  });
});

app.listen(PORT, () => {
  console.log(`[Express API] Running on http://localhost:${PORT}`);
  console.log(`[Observability UI Stats] Available at http://localhost:${PORT}/api/observability/stats`);
  console.log(`[Prometheus Metrics] Available at http://localhost:${PORT}/metrics`);
  console.log(`[Test Error Endpoint] Trigger error at http://localhost:${PORT}/api/simulate-error`);
});
