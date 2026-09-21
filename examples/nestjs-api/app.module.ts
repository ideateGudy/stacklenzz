import {
  Module,
  Controller,
  Get,
  Post,
  BadRequestException,
  InternalServerErrorException,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { ObservabilityModule, CapturedErrorRecord } from "@stacklenzz/server/nestjs";

@Controller("api")
export class AppController {
  @Get("users")
  getUsers() {
    return [
      { id: 1, name: "Alice NestJS", role: "DevOps Engineer" },
      { id: 2, name: "Bob Cloud", role: "Site Reliability Engineer" },
      { id: 3, name: "Charlie Vance", role: "Backend Architect" },
    ];
  }

  @Post("login")
  login() {
    return { success: true, token: "nest_mock_jwt_token" };
  }

  @Get("simulate-error")
  simulateError() {
    throw new InternalServerErrorException(
      "Simulated Database Timeout Exception: Connection lost to cluster pool"
    );
  }

  @Get("simulate-bad-request")
  simulateBadRequest() {
    throw new BadRequestException(
      "Validation Failed: Invalid user payload parameter 'organizationId'"
    );
  }

  @Get("items/:id")
  getItem(@Param("id") id: string) {
    if (id === "999") {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    return { id, name: `Telemetry Item ${id}`, available: true };
  }
}

import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Define Mongoose Schema for NestJS Crash Logs
const crashLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    timestamp: { type: String, required: true },
    serviceName: { type: String, required: true },
    environment: { type: String, required: true },
    errorName: { type: String, required: true },
    message: { type: String, required: true },
    stack: { type: String },
    route: { type: String },
    method: { type: String },
    statusCode: { type: Number },
    fingerprint: { type: String },
    occurrences: { type: Number, default: 1 },
    breadcrumbs: { type: Array, default: [] },
    context: { type: Object, default: {} },
  },
  { timestamps: true }
);

const CrashLogModel = mongoose.models.NestCrashLog || mongoose.model("NestCrashLog", crashLogSchema);

// Connect to MongoDB
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("🌱 [NestJS API] Connected to MongoDB for persistent 5xx crash logging"))
    .catch((err) => console.error("⚠️ [NestJS API] MongoDB Connection Error:", err.message));
} else {
  console.warn("⚠️ [NestJS API] MONGODB_URI is missing in process.env! Check your .env file.");
}

@Module({
  imports: [
    ObservabilityModule.forRoot({
      serviceName: "bookme-nestjs-api",
      autoInitTracing: false,
      crashLogAdaptor: {
        async save(errorLog: CapturedErrorRecord): Promise<void> {
          console.log("💾 [NestJS MongoDB Adaptor] Persisting 5xx crash log:", errorLog.id);
          await CrashLogModel.updateOne({ id: errorLog.id }, errorLog, { upsert: true });
        },
        async list(): Promise<any[]> {
          return await CrashLogModel.find().sort({ createdAt: -1 }).lean();
        },
        async delete(id: string): Promise<void> {
          await CrashLogModel.deleteOne({ id });
        },
        async clearAll(): Promise<void> {
          await CrashLogModel.deleteMany({});
        },
      },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}

