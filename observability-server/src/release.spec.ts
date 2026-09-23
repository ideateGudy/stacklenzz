import { describe, it, expect } from "vitest";
import { getDefaultConfig, getObservabilitySnapshot, resetActiveConfig } from "./core/index.js";

describe("Release & Version Tracking", () => {
  it("should capture explicit release tag in config and snapshot", async () => {
    resetActiveConfig();
    const config = getDefaultConfig({ release: "v2.1.0-beta.1" });
    expect(config.release).toBe("v2.1.0-beta.1");

    const snapshot = await getObservabilitySnapshot({ release: "v2.1.0-beta.1" });
    expect(snapshot.service.release).toBe("v2.1.0-beta.1");
  });

  it("should fallback to environment variables when release is not provided", () => {
    resetActiveConfig();
    const prev = process.env.APP_VERSION;
    process.env.APP_VERSION = "v1.9.4";

    const config = getDefaultConfig({});
    expect(config.release).toBe("v1.9.4");

    if (prev) process.env.APP_VERSION = prev;
    else delete process.env.APP_VERSION;
  });
});
