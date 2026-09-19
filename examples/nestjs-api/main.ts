import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS so the React Vite observability dashboard can fetch /api/observability/stats
  app.enableCors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  const PORT = process.env.PORT || 5000;
  await app.listen(PORT);
  console.log(`[NestJS Observability API] Server running on http://localhost:${PORT}`);
  console.log(`[NestJS Observability API] Metrics at http://localhost:${PORT}/metrics`);
  console.log(`[NestJS Observability API] Stats at http://localhost:${PORT}/api/observability/stats`);
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap NestJS application:", err);
  process.exit(1);
});
