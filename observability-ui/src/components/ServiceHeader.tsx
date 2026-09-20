import React from "react";
import { RefreshCw, Server, ShieldCheck, Clock } from "lucide-react";
import { ObservabilitySnapshot } from "../types.js";
import { useObservability } from "../context.js";

export interface ServiceHeaderProps {
  snapshot: ObservabilitySnapshot | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
  isMock?: boolean;
  activeErrorRate?: number;
}

export function ServiceHeader({
  snapshot,
  onRefresh,
  isRefreshing = false,
  isMock = false,
  activeErrorRate,
}: ServiceHeaderProps) {
  const { themeColors } = useObservability();
  const serviceName = snapshot?.service.name || "backend-service";
  const env = snapshot?.service.environment || "development";
  const uptime = snapshot?.service.uptimeSeconds
    ? formatUptime(snapshot.service.uptimeSeconds)
    : "0s";
  const timestamp = snapshot?.service.timestamp
    ? new Date(snapshot.service.timestamp).toLocaleTimeString()
    : "--:--:--";

  // Compute realistic production dynamic health status using a composite multi-signal health score algorithm
  const healthStatus = React.useMemo(() => {
    if (!snapshot) return { label: "HEALTHY", color: "#34d399", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" };
    
    const errorRate = activeErrorRate !== undefined ? activeErrorRate : (snapshot.summary?.errorRate || 0);
    const p95Latency = snapshot.summary?.p95LatencyMs || 0;
    const cpu = snapshot.runtime?.cpuPercent || 0;
    const lag = snapshot.runtime?.eventLoopLagMs || 0;
    const heapUsed = snapshot.runtime?.heapUsedMb || 0;
    const heapTotal = snapshot.runtime?.heapTotalMb || 1;
    const heapUsagePct = (heapUsed / heapTotal) * 100;

    // Critical conditions: Severe service degradation / outage potential
    // Error rate >= 5% OR P95 Latency >= 2000ms OR CPU >= 90% OR Event Loop Lag >= 100ms OR Heap >= 95%
    if (errorRate >= 5.0 || p95Latency >= 2000 || cpu >= 90 || lag >= 100 || heapUsagePct >= 95) {
      return { label: "CRITICAL", color: "#f87171", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.35)" };
    }

    // Degraded conditions: Warning thresholds where performance is sub-optimal
    // Error rate >= 1% OR P95 Latency >= 800ms OR CPU >= 75% OR Event Loop Lag >= 30ms OR Heap >= 85%
    if (errorRate >= 1.0 || p95Latency >= 800 || cpu >= 75 || lag >= 30 || heapUsagePct >= 85) {
      return { label: "DEGRADED", color: "#fbbf24", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.35)" };
    }

    return { label: "HEALTHY", color: "#34d399", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" };
  }, [snapshot, activeErrorRate]);

  return (
    <div
      style={{
        background: themeColors?.headerBg || "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)",
        border: `1px solid ${themeColors?.cardBorder || "rgba(255, 255, 255, 0.1)"}`,
        borderRadius: "1.25rem",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
        boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Top Hero Section: Server Icon, Title, Env & Refresh Action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.85rem",
          paddingBottom: "0.85rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0, flexWrap: "wrap" }}>
          <div
            style={{
              background: `linear-gradient(135deg, ${themeColors?.accent || "#3b82f6"} 0%, ${themeColors?.accentSecondary || "#06b6d4"} 100%)`,
              boxShadow: `0 0 20px -2px ${themeColors?.glow || "rgba(59, 130, 246, 0.5)"}`,
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "0.875rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            <Server size={22} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <h1
                style={{
                  color: themeColors?.text || "#f8fafc",
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  margin: 0,
                }}
              >
                {serviceName}
              </h1>
              <span
                style={{
                  padding: "0.2rem 0.6rem",
                  borderRadius: "0.375rem",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#cbd5e1",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                Env: <strong style={{ color: "#ffffff", textTransform: "capitalize" }}>{env}</strong>
              </span>
            </div>
            <span style={{ fontSize: "0.75rem", color: themeColors?.textMuted || "#94a3b8", fontFamily: "monospace", marginTop: "0.25rem" }}>
              Synced at <strong style={{ color: "#e2e8f0" }}>{timestamp}</strong>
            </span>
          </div>
        </div>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.45rem",
            padding: "0.45rem 0.95rem",
            borderRadius: "0.65rem",
            background: themeColors?.badgeBg || "rgba(99, 102, 241, 0.18)",
            border: `1px solid ${themeColors?.badgeBorder || "rgba(99, 102, 241, 0.35)"}`,
            color: themeColors?.accent || "#c7d2fe",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: isRefreshing ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            opacity: isRefreshing ? 0.6 : 1,
            outline: "none",
          }}
        >
          <RefreshCw size={13} style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Bottom Service Status Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.85rem",
          fontSize: "0.78rem",
          color: themeColors?.textMuted || "#94a3b8",
          fontWeight: 500,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              background: healthStatus.bg,
              color: healthStatus.color,
              border: `1px solid ${healthStatus.border}`,
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: "0.45rem",
                height: "0.45rem",
                borderRadius: "50%",
                backgroundColor: healthStatus.color,
                boxShadow: `0 0 8px ${healthStatus.color}`,
              }}
            />
            {healthStatus.label}
          </span>

          {isMock && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.25rem 0.75rem",
                borderRadius: "9999px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              DEMO / MOCK MODE
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", color: themeColors?.text || "#cbd5e1", flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: themeColors?.surfaceSubtle || "rgba(255, 255, 255, 0.05)",
              padding: "0.3rem 0.65rem",
              borderRadius: "0.5rem",
              border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.06)"}`,
            }}
          >
            <Clock size={13} color="#34d399" />
            <span>Uptime: <strong style={{ color: "#34d399", fontFamily: "monospace" }}>{uptime}</strong></span>
          </span>
          <span
            style={{
              background: themeColors?.surfaceSubtle || "rgba(255, 255, 255, 0.05)",
              padding: "0.3rem 0.65rem",
              borderRadius: "0.5rem",
              border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.06)"}`,
            }}
          >
            Node <strong style={{ color: themeColors?.accentSecondary || "#a5b4fc", fontFamily: "monospace" }}>{snapshot?.runtime.nodeVersion || "v20"}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${seconds % 60}s`;
}
