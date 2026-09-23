import React from "react";
import { Target, AlertTriangle, ShieldCheck, Flame, Zap } from "lucide-react";
import { useObservability } from "../context.js";
import { ObservabilitySnapshot } from "../types.js";

export interface SloCardProps {
  slo?: ObservabilitySnapshot["slo"];
  summary?: ObservabilitySnapshot["summary"];
}

export function SloCard({ slo, summary }: SloCardProps) {
  const { themeColors } = useObservability();

  if (!slo) return null;

  const { availabilityTarget, currentAvailability, errorBudgetPercent, burnRate, status } = slo;

  const statusColor =
    status === "healthy" ? "#10b981" : status === "at_risk" ? "#f59e0b" : "#ef4444";
  const statusBg =
    status === "healthy"
      ? "rgba(16, 185, 129, 0.12)"
      : status === "at_risk"
      ? "rgba(245, 158, 11, 0.12)"
      : "rgba(239, 68, 68, 0.12)";

  return (
    <div
      style={{
        background: themeColors?.cardBg || "rgba(30, 41, 59, 0.5)",
        border: `1px solid ${themeColors?.cardBorder || "rgba(255, 255, 255, 0.08)"}`,
        borderRadius: "0.875rem",
        padding: "1.25rem",
        marginBottom: "1.5rem",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5rem",
              background: statusBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: statusColor,
            }}
          >
            <Target size={18} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 700,
                color: themeColors?.text || "#f8fafc",
              }}
            >
              Service Level Objective (SLO) & Error Budget
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                color: themeColors?.textMuted || "#94a3b8",
              }}
            >
              Target Availability: <strong>{availabilityTarget}%</strong> • Rolling Period
            </p>
          </div>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            background: statusBg,
            color: statusColor,
            border: `1px solid ${statusColor}40`,
            fontSize: "0.75rem",
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          {status === "healthy" ? (
            <ShieldCheck size={14} />
          ) : (
            <AlertTriangle size={14} />
          )}
          {status.replace("_", " ")}
        </span>
      </div>

      {/* Progress Bar of Remaining Error Budget */}
      <div style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            marginBottom: "0.35rem",
            color: themeColors?.text || "#cbd5e1",
          }}
        >
          <span>
            Remaining Error Budget:{" "}
            <strong style={{ color: statusColor, fontFamily: "monospace" }}>
              {errorBudgetPercent}%
            </strong>
          </span>
          <span>
            Current Availability:{" "}
            <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>
              {currentAvailability}%
            </strong>
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: "10px",
            borderRadius: "9999px",
            background: "rgba(239, 68, 68, 0.25)",
            overflow: "hidden",
            position: "relative",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, errorBudgetPercent))}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${statusColor}, ${statusColor}dd)`,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          fontSize: "0.78rem",
        }}
      >
        <div
          style={{
            padding: "0.6rem 0.85rem",
            borderRadius: "0.5rem",
            background: themeColors?.surfaceSubtle || "rgba(255, 255, 255, 0.04)",
            border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.06)"}`,
          }}
        >
          <div style={{ color: themeColors?.textMuted || "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <Flame size={12} color="#f59e0b" />
            Budget Burn Rate
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: burnRate > 1 ? "#ef4444" : "#10b981", marginTop: "0.2rem", fontFamily: "monospace" }}>
            {burnRate}x
          </div>
          <div style={{ fontSize: "0.7rem", color: themeColors?.textMuted || "#94a3b8" }}>
            {burnRate > 1 ? "Consuming budget too fast" : "Within normal limits"}
          </div>
        </div>

        <div
          style={{
            padding: "0.6rem 0.85rem",
            borderRadius: "0.5rem",
            background: themeColors?.surfaceSubtle || "rgba(255, 255, 255, 0.04)",
            border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.06)"}`,
          }}
        >
          <div style={{ color: themeColors?.textMuted || "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <Zap size={12} color="#38bdf8" />
            Active Error Rate
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: summary?.errorRate && summary.errorRate > 0 ? "#f87171" : "#34d399", marginTop: "0.2rem", fontFamily: "monospace" }}>
            {summary?.errorRate || 0}%
          </div>
          <div style={{ fontSize: "0.7rem", color: themeColors?.textMuted || "#94a3b8" }}>
            Allowed max: {(100 - availabilityTarget).toFixed(2)}%
          </div>
        </div>

        <div
          style={{
            padding: "0.6rem 0.85rem",
            borderRadius: "0.5rem",
            background: themeColors?.surfaceSubtle || "rgba(255, 255, 255, 0.04)",
            border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.06)"}`,
          }}
        >
          <div style={{ color: themeColors?.textMuted || "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <ShieldCheck size={12} color="#10b981" />
            Compliance Status
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: statusColor, marginTop: "0.2rem" }}>
            {status === "healthy" ? "Compliant" : status === "at_risk" ? "Warning" : "Breached"}
          </div>
          <div style={{ fontSize: "0.7rem", color: themeColors?.textMuted || "#94a3b8" }}>
            SRE Target {availabilityTarget}%
          </div>
        </div>
      </div>
    </div>
  );
}
