import readline from "node:readline";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export const STACKLENZZ_TOOLS: McpTool[] = [
  {
    name: "get_service_health",
    description: "Get real-time health score, SLA status, uptime, error rate, and memory/CPU usage for the monitored backend service.",
    inputSchema: {
      type: "object",
      properties: {
        endpoint: {
          type: "string",
          description: "Optional URL of the Stacklenzz stats endpoint (defaults to http://localhost:5000/api/observability/stats)",
        },
      },
    },
  },
  {
    name: "get_recent_errors",
    description: "Retrieve recent 4xx/5xx errors, fingerprints, stack traces, breadcrumbs, and impacted routes.",
    inputSchema: {
      type: "object",
      properties: {
        endpoint: {
          type: "string",
          description: "Optional URL of the Stacklenzz stats endpoint",
        },
        limit: {
          type: "number",
          description: "Maximum number of error records to return (default: 10)",
        },
      },
    },
  },
  {
    name: "get_slow_endpoints",
    description: "List the slowest API endpoints by average latency, p95 latency, and request volume.",
    inputSchema: {
      type: "object",
      properties: {
        endpoint: {
          type: "string",
          description: "Optional URL of the Stacklenzz stats endpoint",
        },
      },
    },
  },
  {
    name: "get_recent_traces",
    description: "Inspect distributed trace waterfall spans (controller, middleware, database) to pinpoint latency bottlenecks.",
    inputSchema: {
      type: "object",
      properties: {
        endpoint: {
          type: "string",
          description: "Optional URL of the Stacklenzz stats endpoint",
        },
        limit: {
          type: "number",
          description: "Number of traces to fetch (default: 5)",
        },
      },
    },
  },
  {
    name: "get_slo_status",
    description: "Get current Service Level Objective (SLO) compliance, availability target, and remaining error budget burn rate.",
    inputSchema: {
      type: "object",
      properties: {
        endpoint: {
          type: "string",
          description: "Optional URL of the Stacklenzz stats endpoint",
        },
      },
    },
  },
];

export async function fetchStats(customUrl?: string) {
  const url = customUrl || process.env.STACKLENZZ_ENDPOINT || "http://localhost:5000/api/observability/stats";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to query Stacklenzz telemetry at ${url} (HTTP ${res.status})`);
  }
  return res.json();
}

export async function executeTool(name: string, args: Record<string, any> = {}): Promise<any> {
  const knownTools = ["get_service_health", "get_recent_errors", "get_slow_endpoints", "get_recent_traces", "get_slo_status"];
  if (!knownTools.includes(name)) {
    return {
      error: `Unknown MCP tool: ${name}`,
    };
  }

  try {
    const stats: any = await fetchStats(args.endpoint);

    switch (name) {
      case "get_service_health":
        return {
          service: stats.service,
          summary: stats.summary,
          runtime: stats.runtime,
          slo: stats.slo,
        };

      case "get_recent_errors":
        const limit = args.limit || 10;
        return {
          recentErrors: (stats.recentErrors || []).slice(0, limit),
          dbCrashLogs: (stats.dbCrashLogs || []).slice(0, limit),
        };

      case "get_slow_endpoints":
        const top = [...(stats.http?.topEndpoints || [])]
          .sort((a, b) => (b.avgDurationMs || 0) - (a.avgDurationMs || 0))
          .slice(0, 10);
        return { slowEndpoints: top };

      case "get_recent_traces":
        const traceLimit = args.limit || 5;
        return {
          traces: (stats.traces || []).slice(0, traceLimit),
        };

      case "get_slo_status":
        return {
          slo: stats.slo || { message: "No SLO targets configured in backend options" },
          errorRate: stats.summary?.errorRate,
        };

      default:
        throw new Error(`Unknown MCP tool: ${name}`);
    }
  } catch (err: any) {
    return {
      error: err.message || String(err),
    };
  }
}

/**
 * Starts the stdio JSON-RPC 2.0 Model Context Protocol (MCP) server
 */
export function startMcpServer(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const sendResponse = (response: any) => {
    process.stdout.write(JSON.stringify(response) + "\n");
  };

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const request = JSON.parse(trimmed);
      const { id, method, params } = request;

      if (method === "tools/list") {
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            tools: STACKLENZZ_TOOLS,
          },
        });
        return;
      }

      if (method === "tools/call") {
        const { name, arguments: toolArgs } = params || {};
        const toolResult = await executeTool(name, toolArgs);
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(toolResult, null, 2),
              },
            ],
          },
        });
        return;
      }

      if (method === "initialize") {
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "@stacklenzz/mcp",
              version: "1.0.0",
            },
          },
        });
        return;
      }

      if (id !== undefined) {
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {},
        });
      }
    } catch (err: any) {
      sendResponse({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${err.message}`,
        },
      });
    }
  });
}
