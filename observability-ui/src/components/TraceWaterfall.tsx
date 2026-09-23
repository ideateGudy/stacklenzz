import React, { useState } from "react";
import { GitCommit, Clock, Layers, ChevronRight, ChevronDown, CheckCircle, XCircle } from "lucide-react";
import { useObservability } from "../context.js";
import { TraceRecord, SpanRecord } from "../types.js";

export interface TraceWaterfallProps {
  traces?: TraceRecord[];
}

export function TraceWaterfall({ traces = [] }: TraceWaterfallProps) {
  const { themeColors } = useObservability();
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(() => traces[0]?.traceId || null);
  const [expandedSpanId, setExpandedSpanId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  if (!traces || traces.length === 0) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          borderRadius: "0.875rem",
          background: themeColors?.cardBg || "rgba(30, 41, 59, 0.5)",
          border: `1px solid ${themeColors?.cardBorder || "rgba(255, 255, 255, 0.08)"}`,
          color: themeColors?.textMuted || "#94a3b8",
          marginTop: "1.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <Layers size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
        <h4 style={{ margin: 0, color: themeColors?.text || "#f8fafc" }}>No Traces Sampled Yet</h4>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>
          In-memory distributed trace waterfall will display here as requests hit your endpoints.
        </p>
      </div>
    );
  }

  const activeTrace = traces.find((t) => t.traceId === selectedTraceId) || traces[0];
  const maxDuration = Math.max(...activeTrace.spans.map((s) => s.durationMs), activeTrace.durationMs, 1);
  const rootStartTime = activeTrace.startTime;

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
              background: "rgba(14, 165, 233, 0.15)",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GitCommit size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: themeColors?.text || "#f8fafc",
                }}
              >
                Distributed Trace Explorer & Waterfall
              </h3>
              <button
                onClick={() => setShowInfo(!showInfo)}
                style={{
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  borderRadius: "9999px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "0.1rem 0.5rem",
                  cursor: "pointer",
                }}
              >
                {showInfo ? "Hide Info" : "What is Trace ID?"}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: themeColors?.textMuted || "#94a3b8" }}>
              Sampled execution spans: Controllers, Handlers, Middlewares, and Database calls.
            </p>
          </div>
        </div>

        {/* Trace selector dropdown */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <select
            value={activeTrace.traceId}
            onChange={(e) => setSelectedTraceId(e.target.value)}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              MozAppearance: "none",
              background: themeColors?.surfaceSubtle || "rgba(15, 23, 42, 0.85)",
              border: `1px solid ${themeColors?.borderSubtle || "rgba(99, 102, 241, 0.25)"}`,
              color: themeColors?.text || "#f8fafc",
              borderRadius: "0.5rem",
              padding: "0.45rem 2.2rem 0.45rem 0.85rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
              transition: "all 0.15s ease",
            }}
          >
            {traces.map((t) => (
              <option
                key={t.traceId}
                value={t.traceId}
                style={{
                  background: "#0f172a",
                  color: "#f8fafc",
                  padding: "0.5rem",
                }}
              >
                {t.method || "REQ"} {t.route || t.rootSpanName} • {t.durationMs < 1 ? t.durationMs.toFixed(2) : t.durationMs}ms ({t.statusCode || 200})
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "#38bdf8",
            }}
          />
        </div>
      </div>

      {/* Info panel explaining Trace ID */}
      {showInfo && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            background: "rgba(56, 189, 248, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.2)",
            color: "#cbd5e1",
            fontSize: "0.78rem",
            lineHeight: 1.5,
            marginBottom: "1rem",
          }}
        >
          <strong style={{ color: "#38bdf8" }}>What is a Trace ID?</strong>
          <br />
          A <strong>Trace ID</strong> (e.g. <code>{activeTrace.traceId}</code>) is a unique correlation identifier assigned to a single HTTP request lifecycle. It binds together all nested function calls, database queries, and log lines generated while fulfilling that request. You can copy this Trace ID into AI editors via <code>@stacklenzz/mcp</code> or search Winston logs to isolate the exact code execution path.
        </div>
      )}

      {/* Trace Overview Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: themeColors?.surfaceSubtle || "rgba(255, 255, 255, 0.03)",
          padding: "0.6rem 0.85rem",
          borderRadius: "0.5rem",
          marginBottom: "1rem",
          fontSize: "0.8rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {activeTrace.status === "ok" ? (
            <CheckCircle size={15} color="#10b981" />
          ) : (
            <XCircle size={15} color="#ef4444" />
          )}
          <strong style={{ color: themeColors?.text || "#f8fafc" }}>{activeTrace.rootSpanName}</strong>
          <span
            style={{
              padding: "0.15rem 0.45rem",
              borderRadius: "0.3rem",
              background: activeTrace.statusCode && activeTrace.statusCode >= 500 ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
              color: activeTrace.statusCode && activeTrace.statusCode >= 500 ? "#f87171" : "#34d399",
              fontSize: "0.72rem",
              fontWeight: 700,
            }}
          >
            {activeTrace.statusCode || 200}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: themeColors?.textMuted || "#94a3b8", fontFamily: "monospace" }}>
          <span>Total: <strong style={{ color: "#38bdf8" }}>{activeTrace.durationMs < 1 ? activeTrace.durationMs.toFixed(2) : activeTrace.durationMs}ms</strong></span>
          <span>Spans: <strong style={{ color: "#cbd5e1" }}>{activeTrace.spans.length}</strong></span>
          <span>Trace ID: <strong style={{ color: "#cbd5e1" }}>{activeTrace.traceId.slice(-8)}</strong></span>
        </div>
      </div>

      {/* Waterfall Gantt Chart */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {activeTrace.spans.map((span) => {
          const widthPct = Math.max(5, (span.durationMs / maxDuration) * 100);
          const isExpanded = expandedSpanId === span.id;

          const typeColor =
            span.type === "controller"
              ? "#a855f7"
              : span.type === "interceptor"
              ? "#3b82f6"
              : span.type === "database"
              ? "#10b981"
              : span.type === "middleware"
              ? "#f59e0b"
              : "#38bdf8";

          return (
            <div
              key={span.id}
              style={{
                borderRadius: "0.5rem",
                background: isExpanded ? "rgba(255, 255, 255, 0.05)" : "transparent",
                border: isExpanded ? `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.1)"}` : "1px solid transparent",
                padding: "0.4rem 0.6rem",
                transition: "all 0.15s ease",
              }}
            >
              <div
                onClick={() => setExpandedSpanId(isExpanded ? null : span.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr 70px",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                }}
              >
                {/* Span label */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", minWidth: 0 }}>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "0.1rem 0.35rem",
                      borderRadius: "0.25rem",
                      background: `${typeColor}25`,
                      color: typeColor,
                    }}
                  >
                    {span.type}
                  </span>
                  <span
                    title={span.name}
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: themeColors?.text || "#f8fafc",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {span.name}
                  </span>
                </div>

                {/* Waterfall Bar */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "14px",
                    background: "rgba(255, 255, 255, 0.04)",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${typeColor}, ${typeColor}cc)`,
                      borderRadius: "4px",
                    }}
                  />
                </div>

                {/* Duration */}
                <div
                  style={{
                    textAlign: "right",
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    color: span.durationMs > 200 ? "#f59e0b" : themeColors?.text || "#cbd5e1",
                    fontWeight: 600,
                  }}
                >
                  {span.durationMs}ms
                </div>
              </div>

              {/* Attributes accordion */}
              {isExpanded && span.attributes && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.5rem",
                    borderRadius: "0.375rem",
                    background: "rgba(0, 0, 0, 0.25)",
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                    color: themeColors?.textMuted || "#94a3b8",
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(span.attributes, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
