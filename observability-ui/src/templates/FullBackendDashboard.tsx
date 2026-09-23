import React from "react";
import { ObservabilityProvider, useObservability } from "../context.js";
import { ServiceHeader } from "../components/ServiceHeader.js";
import { MetricCard, MetricGrid } from "../components/MetricCard.js";
import { HttpStatusChart } from "../components/HttpStatusChart.js";
import { LatencyGauge } from "../components/LatencyGauge.js";
import { EndpointTable } from "../components/EndpointTable.js";
import { RuntimeMetrics } from "../components/RuntimeMetrics.js";
import { ErrorInspector } from "../components/ErrorInspector.js";
import { SloCard } from "../components/SloCard.js";
import { TraceWaterfall } from "../components/TraceWaterfall.js";
import { JobsOverview } from "../components/JobsOverview.js";
import { ObservabilityConfig } from "../types.js";
import { Activity, AlertTriangle, Clock, Zap } from "lucide-react";

export interface FullBackendDashboardProps {
  config?: ObservabilityConfig;
}

function DashboardContent() {
  const { snapshot, isLoading, error, refresh, isMock, themeColors } = useObservability();
  const [errorWindow, setErrorWindow] = React.useState<"all" | "1m" | "5m" | "15m" | "30m" | "1h" | "2h" | "24h" | "7d" | "30d">("all");

  if (isLoading && !snapshot) {
    return (
      <div
        style={{
          minHeight: "450px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: themeColors?.textMuted || "#94a3b8",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", border: "3px solid rgba(255, 255, 255, 0.1)", borderTopColor: themeColors?.accent || "#38bdf8", animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: "1rem", fontSize: "0.875rem" }}>Connecting to backend observability telemetry...</p>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div
        style={{
          padding: "2rem",
          borderRadius: "1rem",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          color: "#fca5a5",
          fontFamily: "Inter, system-ui, sans-serif",
          maxWidth: "600px",
          margin: "2rem auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <AlertTriangle size={20} color="#ef4444" />
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Telemetry Endpoint Offline</h3>
        </div>
        <p style={{ fontSize: "0.875rem", lineHeight: 1.5, color: "#fecaca" }}>
          Could not reach backend telemetry endpoint. Ensure your backend Express or NestJS app is running and instrumented with <code>@stacklenzz/server</code>.
        </p>
        <p style={{ fontSize: "0.75rem", fontFamily: "monospace", background: "rgba(0,0,0,0.3)", padding: "0.75rem", borderRadius: "0.5rem" }}>
          Error: {error.message}
        </p>
        <button
          onClick={refresh}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const s = snapshot!;

  let currentErrorRate = s.summary.errorRate;
  let windowSubtitle = "All-time cumulative";
  let errorCount = Math.round((s.summary.totalRequests * s.summary.errorRate) / 100);

  if (s.windows) {
    if (errorWindow === "1m") {
      currentErrorRate = s.windows.last1m.errorRate;
      errorCount = s.windows.last1m.errorRequests;
      windowSubtitle = `Last 1 min (${s.windows.last1m.totalRequests} reqs)`;
    } else if (errorWindow === "5m") {
      currentErrorRate = s.windows.last5m.errorRate;
      errorCount = s.windows.last5m.errorRequests;
      windowSubtitle = `Last 5 min (${s.windows.last5m.totalRequests} reqs)`;
    } else if (errorWindow === "15m") {
      currentErrorRate = s.windows.last15m.errorRate;
      errorCount = s.windows.last15m.errorRequests;
      windowSubtitle = `Last 15 min (${s.windows.last15m.totalRequests} reqs)`;
    } else if (errorWindow === "30m") {
      currentErrorRate = s.windows.last30m.errorRate;
      errorCount = s.windows.last30m.errorRequests;
      windowSubtitle = `Last 30 min (${s.windows.last30m.totalRequests} reqs)`;
    } else if (errorWindow === "1h") {
      currentErrorRate = s.windows.last1h.errorRate;
      errorCount = s.windows.last1h.errorRequests;
      windowSubtitle = `Last 1 hour (${s.windows.last1h.totalRequests} reqs)`;
    } else if (errorWindow === "2h") {
      currentErrorRate = s.windows.last2h.errorRate;
      errorCount = s.windows.last2h.errorRequests;
      windowSubtitle = `Last 2 hours (${s.windows.last2h.totalRequests} reqs)`;
    } else if (errorWindow === "24h") {
      currentErrorRate = s.windows.last24h.errorRate;
      errorCount = s.windows.last24h.errorRequests;
      windowSubtitle = `Last 24 hours (${s.windows.last24h.totalRequests} reqs)`;
    } else if (errorWindow === "7d") {
      currentErrorRate = s.windows.last7d.errorRate;
      errorCount = s.windows.last7d.errorRequests;
      windowSubtitle = `Last 7 days (${s.windows.last7d.totalRequests} reqs)`;
    } else if (errorWindow === "30d") {
      currentErrorRate = s.windows.last30d.errorRate;
      errorCount = s.windows.last30d.errorRequests;
      windowSubtitle = `Last 30 days (${s.windows.last30d.totalRequests} reqs)`;
    }
  }

  return (
    <div
      style={{
        padding: "0 1.5rem 2rem 1.5rem",
        background: "transparent",
        color: themeColors ? themeColors.text : "#f8fafc",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        margin: "0 auto",
        width: "100%",
        maxWidth: "1536px",
        boxSizing: "border-box",
      }}
    >
      <ServiceHeader
        snapshot={s}
        onRefresh={refresh}
        isRefreshing={isLoading}
        isMock={isMock}
        activeErrorRate={currentErrorRate}
      />

      {/* Service Level Objective & Error Budget */}
      {s.slo && <SloCard slo={s.slo} summary={s.summary} />}

      {/* Top 4 Key Metric Cards */}
      <MetricGrid>
        <MetricCard
          title="Total Requests"
          value={s.summary.totalRequests.toLocaleString()}
          subtitle={`${s.summary.activeRequests} active in-flight`}
          trend={{ value: "+14.2% /hr", isPositive: true }}
          icon={<Activity size={18} color="#38bdf8" />}
          statusColor="blue"
        />
        <MetricCard
          title="Error Rate"
          value={`${currentErrorRate}%`}
          subtitle={`${errorCount} errors | ${windowSubtitle}`}
          trend={{ value: currentErrorRate > 1 ? "+Degraded" : "Normal", isPositive: currentErrorRate <= 1 }}
          icon={<AlertTriangle size={18} color={currentErrorRate > 1 ? "#ef4444" : "#10b981"} />}
          rightElement={
            <select
              value={errorWindow}
              onChange={(e) => setErrorWindow(e.target.value as any)}
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "0.375rem",
                color: "#94a3b8",
                fontSize: "0.75rem",
                padding: "0.2rem 0.4rem",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All-time</option>
              <option value="1m">Last 1 min</option>
              <option value="5m">Last 5 min</option>
              <option value="15m">Last 15 min</option>
              <option value="30m">Last 30 min</option>
              <option value="1h">Last 1 hour</option>
              <option value="2h">Last 2 hours</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          }
          statusColor={currentErrorRate > 1 ? "rose" : "emerald"}
        />
        <MetricCard
          title="P95 Latency"
          value={`${s.summary.p95LatencyMs} ms`}
          subtitle={`P50: ${s.summary.p50LatencyMs}ms | P99: ${s.summary.p99LatencyMs}ms`}
          trend={{ value: "-12ms", isPositive: true }}
          icon={<Clock size={18} color="#a855f7" />}
          statusColor="indigo"
        />
        <MetricCard
          title="Process CPU"
          value={`${s.runtime.cpuPercent}%`}
          subtitle={`RSS: ${s.runtime.memoryRssMb} MB | Heap: ${s.runtime.heapUsedMb} MB`}
          icon={<Zap size={18} color="#f59e0b" />}
          statusColor="amber"
        />
      </MetricGrid>

      {/* Charts split row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "1.25rem",
          marginBottom: "1.5rem",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <HttpStatusChart breakdown={s.http.statusBreakdown} />
        <LatencyGauge
          p50={s.summary.p50LatencyMs}
          p95={s.summary.p95LatencyMs}
          p99={s.summary.p99LatencyMs}
          avg={s.summary.avgLatencyMs}
        />
      </div>

      {/* Runtime details */}
      <RuntimeMetrics
        cpuPercent={s.runtime.cpuPercent}
        memoryRssMb={s.runtime.memoryRssMb}
        heapUsedMb={s.runtime.heapUsedMb}
        heapTotalMb={s.runtime.heapTotalMb}
        eventLoopLagMs={s.runtime.eventLoopLagMs}
        nodeVersion={s.runtime.nodeVersion}
      />

      {/* Endpoints Table */}
      <EndpointTable endpoints={s.http.topEndpoints} />

      {/* Jobs Overview (BullMQ, Agenda, Cron) */}
      <JobsOverview jobs={s.jobs} />

      {/* Distributed Trace Explorer Waterfall */}
      <TraceWaterfall traces={s.traces} />

      {/* Live Error Inspector synced with timeWindow & Global Breadcrumbs Feed */}
      <ErrorInspector
        errors={s.recentErrors}
        globalBreadcrumbs={s.breadcrumbs}
        timeWindow={errorWindow}
      />
    </div>
  );
}

export function FullBackendDashboard({ config }: FullBackendDashboardProps) {
  return (
    <ObservabilityProvider config={config}>
      <DashboardContent />
    </ObservabilityProvider>
  );
}
