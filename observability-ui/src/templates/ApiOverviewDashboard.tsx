import React from "react";
import { ObservabilityProvider, useObservability } from "../context.js";
import { ServiceHeader } from "../components/ServiceHeader.js";
import { MetricCard, MetricGrid } from "../components/MetricCard.js";
import { HttpStatusChart } from "../components/HttpStatusChart.js";
import { EndpointTable } from "../components/EndpointTable.js";
import { ObservabilityConfig } from "../types.js";
import { Activity, Globe, CheckCircle2 } from "lucide-react";

export interface ApiOverviewDashboardProps {
  config?: ObservabilityConfig;
}

function ApiOverviewContent() {
  const { snapshot, isLoading, refresh, isMock, themeColors } = useObservability();
  if (!snapshot) return null;
  const s = snapshot;

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
      <ServiceHeader snapshot={s} onRefresh={refresh} isRefreshing={isLoading} isMock={isMock} />
      <MetricGrid>
        <MetricCard title="Total HTTP Requests" value={s.summary.totalRequests.toLocaleString()} subtitle="All tracked routes" icon={<Globe size={18} color="#38bdf8" />} statusColor="blue" />
        <MetricCard title="Active In-Flight" value={s.summary.activeRequests} subtitle="Concurrent connections" icon={<Activity size={18} color="#10b981" />} statusColor="emerald" />
        <MetricCard title="2xx Success Ratio" value={`${((s.http.statusBreakdown.status2xx / (s.summary.totalRequests || 1)) * 100).toFixed(1)}%`} subtitle="Clean responses" icon={<CheckCircle2 size={18} color="#10b981" />} statusColor="emerald" />
      </MetricGrid>
      <div style={{ marginBottom: "1.5rem" }}>
        <HttpStatusChart breakdown={s.http.statusBreakdown} />
      </div>
      <EndpointTable endpoints={s.http.topEndpoints} />
    </div>
  );
}

export function ApiOverviewDashboard({ config }: ApiOverviewDashboardProps) {
  return (
    <ObservabilityProvider config={config}>
      <ApiOverviewContent />
    </ObservabilityProvider>
  );
}
