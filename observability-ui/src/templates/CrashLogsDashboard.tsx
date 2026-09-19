import React from "react";
import { ObservabilityProvider, useObservability } from "../context.js";
import { ServiceHeader } from "../components/ServiceHeader.js";
import { MetricCard, MetricGrid } from "../components/MetricCard.js";
import { CrashLogsList } from "../components/CrashLogsList.js";
import { ObservabilityConfig } from "../types.js";
import { Database, AlertOctagon, Layers } from "lucide-react";

export interface CrashLogsDashboardProps {
  config?: ObservabilityConfig;
}

function CrashLogsDashboardContent() {
  const { snapshot, isLoading, refresh, isMock, themeColors, dbCrashLogs } = useObservability();
  if (!snapshot) return null;
  const s = snapshot;

  const totalCrashes = dbCrashLogs.length;
  const uniqueRoutes = new Set(dbCrashLogs.map((l) => l.route || "general")).size;
  const totalOccurrences = dbCrashLogs.reduce((acc, l) => acc + (l.occurrences || 1), 0);

  return (
    <div
      style={{
        padding: "0 1.5rem 2rem 1.5rem",
        background: "transparent",
        color: themeColors ? themeColors.text : "#f8fafc",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      <ServiceHeader snapshot={s} onRefresh={refresh} isRefreshing={isLoading} isMock={isMock} />

      <MetricGrid>
        <MetricCard
          title="Persisted 5xx Crashes"
          value={totalCrashes.toString()}
          subtitle="Total distinct crash records in database"
          icon={<Database size={18} color="#ef4444" />}
          statusColor={totalCrashes > 0 ? "rose" : "emerald"}
        />
        <MetricCard
          title="Total Impacted Events"
          value={totalOccurrences.toLocaleString()}
          subtitle="Cumulative crash occurrences"
          icon={<AlertOctagon size={18} color="#f59e0b" />}
          statusColor={totalOccurrences > 0 ? "amber" : "emerald"}
        />
        <MetricCard
          title="Affected Endpoints"
          value={uniqueRoutes.toString()}
          subtitle="Distinct endpoints with 5xx incidents"
          icon={<Layers size={18} color="#6366f1" />}
          statusColor={uniqueRoutes > 0 ? "indigo" : "emerald"}
        />
      </MetricGrid>

      <div style={{ marginTop: "1.5rem" }}>
        <CrashLogsList />
      </div>
    </div>
  );
}

export function CrashLogsDashboard({ config }: CrashLogsDashboardProps) {
  return (
    <ObservabilityProvider config={config}>
      <CrashLogsDashboardContent />
    </ObservabilityProvider>
  );
}
