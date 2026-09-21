import React from "react";
import { ObservabilityProvider, useObservability } from "../context.js";
import { ServiceHeader } from "../components/ServiceHeader.js";
import { MetricCard, MetricGrid } from "../components/MetricCard.js";
import { HttpStatusChart } from "../components/HttpStatusChart.js";
import { EndpointTable } from "../components/EndpointTable.js";
import { ErrorInspector } from "../components/ErrorInspector.js";
import { ObservabilityConfig } from "../types.js";
import { AlertOctagon, AlertTriangle, ShieldAlert } from "lucide-react";

export interface ErrorMonitoringDashboardProps {
  config?: ObservabilityConfig;
}

function ErrorMonitoringContent() {
  const { snapshot, isLoading, refresh, isMock, themeColors } = useObservability();
  if (!snapshot) return null;
  const s = snapshot;

  const errorEndpoints = s.http.topEndpoints.filter((e) => e.errorCount > 0);

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
        <MetricCard title="Overall Error Rate" value={`${s.summary.errorRate}%`} subtitle="Percentage of all requests" icon={<AlertTriangle size={18} color={s.summary.errorRate > 1 ? "#ef4444" : "#10b981"} />} statusColor={s.summary.errorRate > 1 ? "rose" : "emerald"} />
        <MetricCard title="5xx Server Errors" value={s.http.statusBreakdown.status5xx.toLocaleString()} subtitle="Internal errors" icon={<AlertOctagon size={18} color="#ef4444" />} statusColor="rose" />
        <MetricCard title="4xx Client Errors" value={s.http.statusBreakdown.status4xx.toLocaleString()} subtitle="Bad requests / 404s" icon={<ShieldAlert size={18} color="#f59e0b" />} statusColor="amber" />
      </MetricGrid>
      <div style={{ marginBottom: "1.5rem" }}>
        <HttpStatusChart breakdown={s.http.statusBreakdown} />
      </div>
      <div style={{ marginTop: "1rem" }}>
        <EndpointTable endpoints={errorEndpoints.length > 0 ? errorEndpoints : s.http.topEndpoints} />
      </div>
      <ErrorInspector errors={s.recentErrors} />
    </div>
  );
}

export function ErrorMonitoringDashboard({ config }: ErrorMonitoringDashboardProps) {
  return (
    <ObservabilityProvider config={config}>
      <ErrorMonitoringContent />
    </ObservabilityProvider>
  );
}
