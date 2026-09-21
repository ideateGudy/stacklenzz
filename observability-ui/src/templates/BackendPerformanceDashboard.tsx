import React from "react";
import { ObservabilityProvider, useObservability } from "../context.js";
import { ServiceHeader } from "../components/ServiceHeader.js";
import { MetricCard, MetricGrid } from "../components/MetricCard.js";
import { LatencyGauge } from "../components/LatencyGauge.js";
import { EndpointTable } from "../components/EndpointTable.js";
import { ObservabilityConfig } from "../types.js";
import { Clock, Zap, Target } from "lucide-react";

export interface BackendPerformanceDashboardProps {
  config?: ObservabilityConfig;
}

function PerformanceContent() {
  const { snapshot, isLoading, refresh, isMock, themeColors } = useObservability();
  if (!snapshot) return null;
  const s = snapshot;

  return (
    <div style={{ padding: "0 1.5rem 2rem 1.5rem", background: "transparent", color: themeColors ? themeColors.text : "#f8fafc", fontFamily: "Inter, system-ui, -apple-system, sans-serif", margin: "0 auto", width: "100%", maxWidth: "1536px", boxSizing: "border-box" }}>
      <ServiceHeader snapshot={s} onRefresh={refresh} isRefreshing={isLoading} isMock={isMock} />
      <MetricGrid>
        <MetricCard title="Average Latency" value={`${s.summary.avgLatencyMs} ms`} subtitle="Mean response duration" icon={<Clock size={18} color="#38bdf8" />} statusColor="blue" />
        <MetricCard title="P95 Latency" value={`${s.summary.p95LatencyMs} ms`} subtitle="95th percentile" icon={<Target size={18} color="#a855f7" />} statusColor="indigo" />
        <MetricCard title="P99 Spike Latency" value={`${s.summary.p99LatencyMs} ms`} subtitle="Worst 1% tail latency" icon={<Zap size={18} color="#f59e0b" />} statusColor="amber" />
      </MetricGrid>
      <div style={{ marginBottom: "1.5rem" }}>
        <LatencyGauge p50={s.summary.p50LatencyMs} p95={s.summary.p95LatencyMs} p99={s.summary.p99LatencyMs} avg={s.summary.avgLatencyMs} />
      </div>
      <EndpointTable endpoints={s.http.topEndpoints} />
    </div>
  );
}

export function BackendPerformanceDashboard({ config }: BackendPerformanceDashboardProps) {
  return (
    <ObservabilityProvider config={config}>
      <PerformanceContent />
    </ObservabilityProvider>
  );
}
