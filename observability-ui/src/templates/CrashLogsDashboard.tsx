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

  // Deduplicate raw database crash log entries by endpoint signature for dashboard metric cards
  const deduplicatedCrashLogs = React.useMemo(() => {
    const map = new Map<string, typeof dbCrashLogs[0]>();
    for (const log of dbCrashLogs) {
      let cleanMsg = (log.message || "").trim().replace(/^HTTP (Server|Client) Error \(\d+\) on \w+ [^:]+:\s*/i, "");
      const normRoute = (log.route || "").trim().toLowerCase();
      const key = `${log.method || "GET"}:${normRoute}:${log.statusCode || 500}`;

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.occurrences = (existing.occurrences || 1) + (log.occurrences || 1);
      } else {
        map.set(key, { ...log, occurrences: log.occurrences || 1 });
      }
    }
    return Array.from(map.values());
  }, [dbCrashLogs]);

  const totalCrashes = deduplicatedCrashLogs.length;
  const uniqueRoutes = new Set(deduplicatedCrashLogs.map((l) => l.route || "general")).size;
  const totalOccurrences = deduplicatedCrashLogs.reduce((acc, l) => acc + (l.occurrences || 1), 0);

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
