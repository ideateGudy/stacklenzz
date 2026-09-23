# `@stacklenzz/mcp`

The official Model Context Protocol (MCP) server for Stacklenzz, enabling AI coding assistants (Cursor, Windsurf, Claude, Gemini) to inspect and query live backend observability telemetry directly within your AI chat.

---

## ⚡ Quick Start

### 1. Run via NPX

```bash
npx @stacklenzz/mcp
```

By default, the MCP server connects to your local telemetry stats endpoint at `http://localhost:5000/api/observability/stats`. You can override this using the `STACKLENZZ_ENDPOINT` environment variable.

---

## 🤖 Configuring in AI Editors

### Cursor (`settings.json` or `.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "stacklenzz": {
      "command": "npx",
      "args": ["-y", "@stacklenzz/mcp"],
      "env": {
        "STACKLENZZ_ENDPOINT": "http://localhost:5000/api/observability/stats"
      }
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "stacklenzz": {
      "command": "npx",
      "args": ["-y", "@stacklenzz/mcp"],
      "env": {
        "STACKLENZZ_ENDPOINT": "http://localhost:5000/api/observability/stats"
      }
    }
  }
}
```

---

## 🛠️ Available Diagnostic Tools

Once connected, your AI assistant can invoke:

| Tool | Description |
|---|---|
| `get_service_health` | Retrieves SLA health score, uptime, 5xx error rate, and CPU/memory utilization |
| `get_recent_errors` | Returns latest 4xx/5xx crash logs, stack traces, breadcrumb trails, and error fingerprints |
| `get_slow_endpoints` | Lists the top latency bottlenecks across all monitored routes |
| `get_recent_traces` | Inspects distributed trace waterfalls (Controllers, Guards, Interceptors, DB spans) |
| `get_slo_status` | Returns Service Level Objective compliance and remaining error budget burn rate |

---

## 📄 License

Apache-2.0
