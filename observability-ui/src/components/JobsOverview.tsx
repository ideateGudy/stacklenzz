import React from "react";
import { Cpu, CheckCircle, XCircle, Play, Layers, Clock } from "lucide-react";
import { useObservability } from "../context.js";
import { JobMetricsSummary } from "../types.js";

export interface JobsOverviewProps {
  jobs?: JobMetricsSummary;
}

export function JobsOverview({ jobs }: JobsOverviewProps) {
  const { themeColors } = useObservability();

  if (!jobs || jobs.totalJobs === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: themeColors?.cardBg || "rgba(30, 41, 59, 0.5)",
        border: `1px solid ${themeColors?.cardBorder || "rgba(255, 255, 255, 0.08)"}`,
        borderRadius: "0.875rem",
        padding: "1.25rem",
        marginTop: "1.75rem",
        marginBottom: "1.5rem",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.08)"}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5rem",
              background: "rgba(168, 85, 247, 0.15)",
              color: "#a855f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Cpu size={18} />
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
              Background Jobs & Queue Workers
            </h3>
            <p style={{ margin: 0, fontSize: "0.75rem", color: themeColors?.textMuted || "#94a3b8" }}>
              Execution health for BullMQ, Agenda, Cron, and async tasks.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span
            style={{
              padding: "0.2rem 0.55rem",
              borderRadius: "0.35rem",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              fontSize: "0.72rem",
              fontWeight: 700,
            }}
          >
            {jobs.completedJobs} Completed
          </span>
          {jobs.failedJobs > 0 && (
            <span
              style={{
                padding: "0.2rem 0.55rem",
                borderRadius: "0.35rem",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#f87171",
                fontSize: "0.72rem",
                fontWeight: 700,
              }}
            >
              {jobs.failedJobs} Failed
            </span>
          )}
        </div>
      </div>

      {/* Jobs Summary Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
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
          <div style={{ fontSize: "0.75rem", color: themeColors?.textMuted || "#94a3b8" }}>Active Running</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#38bdf8", marginTop: "0.2rem" }}>
            {jobs.activeJobs}
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
          <div style={{ fontSize: "0.75rem", color: themeColors?.textMuted || "#94a3b8" }}>Failure Rate</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: jobs.failureRate > 0 ? "#f87171" : "#34d399", marginTop: "0.2rem" }}>
            {jobs.failureRate}%
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
          <div style={{ fontSize: "0.75rem", color: themeColors?.textMuted || "#94a3b8" }}>Avg Duration</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#cbd5e1", marginTop: "0.2rem" }}>
            {jobs.avgDurationMs}ms
          </div>
        </div>
      </div>

      {/* Recent Jobs List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {jobs.recentJobs.slice(0, 5).map((job) => (
          <div
            key={job.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.45rem 0.75rem",
              borderRadius: "0.4rem",
              background: "rgba(255, 255, 255, 0.02)",
              fontSize: "0.75rem",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              {job.status === "completed" ? (
                <CheckCircle size={14} color="#10b981" />
              ) : job.status === "failed" ? (
                <XCircle size={14} color="#ef4444" />
              ) : (
                <Play size={14} color="#38bdf8" />
              )}
              <span style={{ fontWeight: 600, color: themeColors?.text || "#f8fafc" }}>{job.name}</span>
              <span style={{ color: themeColors?.textMuted || "#94a3b8", fontSize: "0.7rem" }}>({job.queue || "default"})</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontFamily: "monospace" }}>
              {job.durationMs !== undefined && (
                <span style={{ color: "#38bdf8" }}>{job.durationMs}ms</span>
              )}
              <span
                style={{
                  color:
                    job.status === "completed" ? "#34d399" : job.status === "failed" ? "#f87171" : "#38bdf8",
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}
              >
                {job.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
