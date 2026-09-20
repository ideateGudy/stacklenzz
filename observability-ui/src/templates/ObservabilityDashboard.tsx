import React, { useState } from "react";
import { ObservabilityConfig } from "../types.js";
import { ObservabilityProvider, useObservability } from "../context.js";
import {
  DashboardSwitcher,
  DashboardTemplateType,
} from "../components/DashboardSwitcher.js";
import { FullBackendDashboard } from "./FullBackendDashboard.js";
import { ApiOverviewDashboard } from "./ApiOverviewDashboard.js";
import { BackendPerformanceDashboard } from "./BackendPerformanceDashboard.js";
import { ErrorMonitoringDashboard } from "./ErrorMonitoringDashboard.js";
import { NodeRuntimeDashboard } from "./NodeRuntimeDashboard.js";
import { MinimalDashboard } from "./MinimalDashboard.js";
import { CrashLogsDashboard } from "./CrashLogsDashboard.js";

export interface ObservabilityDashboardProps {
  config?: ObservabilityConfig;
  defaultDashboard?: DashboardTemplateType;
  showSwitcher?: boolean;
}

const STORAGE_KEY = "stacklenzz_active_dashboard";

function ObservabilityDashboardInner({
  config,
  defaultDashboard = "full",
  showSwitcher = true,
}: ObservabilityDashboardProps) {
  const [currentDashboard, setCurrentDashboard] = useState<DashboardTemplateType>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY) as DashboardTemplateType | null;
      if (saved && ["full", "api", "performance", "errors", "runtime", "minimal", "crash-logs"].includes(saved)) {
        return saved;
      }
    }
    return defaultDashboard;
  });

  const handleDashboardChange = (newDashboard: DashboardTemplateType) => {
    setCurrentDashboard(newDashboard);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, newDashboard);
      } catch {
        // Ignore quota/access errors
      }
    }
  };

  const { themeColors } = useObservability();
  const endpoint = config?.endpoint || "http://localhost:5000/api/observability/stats";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: themeColors.background,
        color: themeColors.text,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        transition: "background-color 0.25s ease, color 0.25s ease",
      }}
    >
      {showSwitcher && (
        <div style={{ padding: "1.25rem 1.5rem 0 1.5rem" }}>
          <DashboardSwitcher
            currentDashboard={currentDashboard}
            onChangeDashboard={handleDashboardChange}
            endpoint={endpoint}
          />
        </div>
      )}

      {currentDashboard === "full" && <FullBackendDashboard config={config} />}
      {currentDashboard === "api" && <ApiOverviewDashboard config={config} />}
      {currentDashboard === "performance" && (
        <BackendPerformanceDashboard config={config} />
      )}
      {currentDashboard === "errors" && (
        <ErrorMonitoringDashboard config={config} />
      )}
      {currentDashboard === "crash-logs" && (
        <CrashLogsDashboard config={config} />
      )}
      {currentDashboard === "runtime" && (
        <NodeRuntimeDashboard config={config} />
      )}
      {currentDashboard === "minimal" && (
        <div style={{ padding: "0 1.5rem 2rem 1.5rem", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          <MinimalDashboard config={config} />
        </div>
      )}
    </div>
  );
}

/**
 * Universal Observability Dashboard with an interactive Template Switcher
 * and dynamic 6 Built-in Runtime Theme Switcher (Tokyo Night, Nord, Dracula, Catppuccin, Emerald, Cyberpunk).
 */
export function ObservabilityDashboard(props: ObservabilityDashboardProps) {
  return (
    <ObservabilityProvider config={props.config}>
      <ObservabilityDashboardInner {...props} />
    </ObservabilityProvider>
  );
}

