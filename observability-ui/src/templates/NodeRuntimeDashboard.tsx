import React from "react";
import { ObservabilityProvider, useObservability } from "../context.js";
import { ServiceHeader } from "../components/ServiceHeader.js";
import { MetricCard, MetricGrid } from "../components/MetricCard.js";
import { RuntimeMetrics } from "../components/RuntimeMetrics.js";
import { ObservabilityConfig } from "../types.js";
import { Cpu, HardDrive, Zap, Box } from "lucide-react";

export interface NodeRuntimeDashboardProps {
  config?: ObservabilityConfig;
}

function NodeRuntimeContent() {
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
        <MetricCard title="Node Process CPU" value={`${s.runtime.cpuPercent}%`} subtitle="Core workload" icon={<Cpu size={18} color="#38bdf8" />} statusColor="blue" />
        <MetricCard title="Resident Memory (RSS)" value={`${s.runtime.memoryRssMb} MB`} subtitle="Total allocated RAM" icon={<HardDrive size={18} color="#a855f7" />} statusColor="indigo" />
        <MetricCard title="Heap Allocation" value={`${s.runtime.heapUsedMb} MB`} subtitle={`Total limit: ${s.runtime.heapTotalMb} MB`} icon={<Box size={18} color="#10b981" />} statusColor="emerald" />
        <MetricCard title="Event Loop Lag" value={`${s.runtime.eventLoopLagMs} ms`} subtitle="Pacing delta" icon={<Zap size={18} color="#f59e0b" />} statusColor="amber" />
      </MetricGrid>
      <RuntimeMetrics
        cpuPercent={s.runtime.cpuPercent}
        memoryRssMb={s.runtime.memoryRssMb}
        heapUsedMb={s.runtime.heapUsedMb}
        heapTotalMb={s.runtime.heapTotalMb}
        eventLoopLagMs={s.runtime.eventLoopLagMs}
        nodeVersion={s.runtime.nodeVersion}
      />
    </div>
  );
}

export function NodeRuntimeDashboard({ config }: NodeRuntimeDashboardProps) {
  return (
    <ObservabilityProvider config={config}>
      <NodeRuntimeContent />
    </ObservabilityProvider>
  );
}
