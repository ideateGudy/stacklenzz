import { describe, it, expect } from "vitest";
import { STACKLENZZ_TOOLS, executeTool } from "./index.js";

describe("@stacklenzz/mcp", () => {
  it("should expose all standard MCP diagnostic tools", () => {
    const toolNames = STACKLENZZ_TOOLS.map((t) => t.name);
    expect(toolNames).toContain("get_service_health");
    expect(toolNames).toContain("get_recent_errors");
    expect(toolNames).toContain("get_slow_endpoints");
    expect(toolNames).toContain("get_recent_traces");
    expect(toolNames).toContain("get_slo_status");
  });

  it("should handle unknown tool names gracefully", async () => {
    const res = await executeTool("unknown_tool", {});
    expect(res.error).toBeDefined();
    expect(res.error).toContain("Unknown MCP tool");
  });
});
