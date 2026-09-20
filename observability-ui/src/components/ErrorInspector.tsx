import React, { useState } from "react";
import { CapturedErrorRecord, Breadcrumb } from "../types.js";
import { useObservability } from "../context.js";
import {
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Terminal,
  Database,
  Globe,
  Key,
  FileText,
  Layers,
  Cpu,
  Server,
  Tag,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

export interface ErrorInspectorProps {
  errors?: CapturedErrorRecord[];
  globalBreadcrumbs?: Breadcrumb[];
  timeWindow?: "all" | "1m" | "5m" | "15m" | "30m" | "1h" | "2h" | "24h" | "7d" | "30d";
}

function getWindowMs(window: string): number | null {
  switch (window) {
    case "1m":
      return 60 * 1000;
    case "5m":
      return 5 * 60 * 1000;
    case "15m":
      return 15 * 60 * 1000;
    case "30m":
      return 30 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "2h":
      return 2 * 60 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

function getBreadcrumbIcon(category: Breadcrumb["category"]) {
  switch (category) {
    case "db":
      return <Database size={12} color="#38bdf8" />;
    case "http":
      return <Globe size={12} color="#818cf8" />;
    case "auth":
      return <Key size={12} color="#f59e0b" />;
    case "log":
      return <FileText size={12} color="#94a3b8" />;
    default:
      return <Tag size={12} color="#10b981" />;
  }
}

export function ErrorInspector({ errors = [], globalBreadcrumbs = [], timeWindow = "all" }: ErrorInspectorProps) {
  const { themeColors } = useObservability();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "5xx" | "4xx">("all");
  const [viewMode, setViewMode] = useState<"errors" | "breadcrumbs">("errors");
  const [breadcrumbOrder, setBreadcrumbOrder] = useState<"newest" | "oldest">("newest");
  const [activeTab, setActiveTab] = useState<Record<string, "breadcrumbs" | "response" | "stack" | "context">>({});

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    if (!activeTab[id]) {
      setActiveTab((prev) => ({ ...prev, [id]: "breadcrumbs" }));
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const windowMs = getWindowMs(timeWindow);
  const cutoff = windowMs ? Date.now() - windowMs : 0;

  // Filter errors by time window, calculate window occurrences, and filter internal breadcrumbs
  const processedErrors = errors
    .map((err) => {
      let windowOccurrences = err.occurrences || 1;
      if (cutoff > 0) {
        if (err.timestamps && err.timestamps.length > 0) {
          windowOccurrences = err.timestamps.filter((ts) => ts >= cutoff).length;
        } else {
          windowOccurrences = err.timestamp >= cutoff ? (err.occurrences || 1) : 0;
        }
      }

      // Filter breadcrumbs prior to error that fall within the selected time window
      const windowBreadcrumbs = (err.breadcrumbs || []).filter((b) => {
        if (cutoff > 0 && b.timestamp < cutoff) return false;
        return true;
      });

      return {
        ...err,
        windowOccurrences,
        filteredBreadcrumbs: windowBreadcrumbs,
      };
    })
    .filter((err) => {
      // If a time window is active, hide errors that had 0 occurrences in that window
      if (cutoff > 0 && err.windowOccurrences <= 0) {
        return false;
      }
      const sc = err.statusCode || 500;
      if (statusFilter === "5xx") return sc >= 500;
      if (statusFilter === "4xx") return sc >= 400 && sc < 500;
      return true;
    });

  const filteredGlobalBreadcrumbs = globalBreadcrumbs.filter((b) => {
    if (cutoff > 0 && b.timestamp < cutoff) return false;
    return true;
  });

  return (
    <div
      style={{
        background: themeColors?.cardBg || "rgba(15, 23, 42, 0.75)",
        border: `1px solid ${themeColors?.cardBorder || "rgba(239, 68, 68, 0.2)"}`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: "1.25rem",
        padding: "1.25rem 1.5rem",
        boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
        marginTop: "1.5rem",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "0.65rem",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
                flexShrink: 0,
              }}
            >
              <AlertCircle size={18} />
            </div>
            <h3
              style={{
                color: themeColors?.text || "#f8fafc",
                fontSize: "1.05rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Recent Exceptions & Failure Logs ({processedErrors.length})
            </h3>
          </div>

          {/* View Mode Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: themeColors?.surfaceSubtle || "rgba(15, 23, 42, 0.9)",
              padding: "0.25rem",
              borderRadius: "0.75rem",
              border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.1)"}`,
              fontSize: "0.75rem",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setViewMode("errors")}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontWeight: 800,
                fontSize: "0.75rem",
                backgroundColor: viewMode === "errors" ? "#dc2626" : "transparent",
                color: viewMode === "errors" ? "#ffffff" : (themeColors?.textMuted || "#94a3b8"),
                boxShadow: viewMode === "errors" ? "0 4px 12px rgba(220, 38, 38, 0.4)" : "none",
              }}
            >
              Exceptions ({processedErrors.length})
            </button>
            <button
              onClick={() => setViewMode("breadcrumbs")}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontWeight: 700,
                fontSize: "0.75rem",
                backgroundColor: viewMode === "breadcrumbs" ? (themeColors?.accentSecondary || "#4f46e5") : "transparent",
                color: viewMode === "breadcrumbs" ? "#ffffff" : (themeColors?.textMuted || "#94a3b8"),
                boxShadow: viewMode === "breadcrumbs" ? `0 4px 12px ${themeColors?.glow || "rgba(79, 70, 229, 0.4)"}` : "none",
              }}
            >
              Live Breadcrumbs ({filteredGlobalBreadcrumbs.length})
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {viewMode === "errors" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: themeColors?.surfaceSubtle || "rgba(15, 23, 42, 0.9)",
                padding: "0.25rem",
                borderRadius: "0.65rem",
                border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.1)"}`,
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              <button
                onClick={() => setStatusFilter("all")}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "0.45rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.72rem",
                  backgroundColor: statusFilter === "all" ? (themeColors?.badgeBg || "#334155") : "transparent",
                  color: statusFilter === "all" ? (themeColors?.text || "#ffffff") : (themeColors?.textMuted || "#94a3b8"),
                  fontWeight: statusFilter === "all" ? 700 : 500,
                }}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("5xx")}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "0.45rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.72rem",
                  backgroundColor: statusFilter === "5xx" ? "#dc2626" : "rgba(220, 38, 38, 0.15)",
                  color: statusFilter === "5xx" ? "#ffffff" : "#fca5a5",
                }}
              >
                5xx Server
              </button>
              <button
                onClick={() => setStatusFilter("4xx")}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "0.45rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.72rem",
                  backgroundColor: statusFilter === "4xx" ? "#f59e0b" : "rgba(245, 158, 11, 0.15)",
                  color: statusFilter === "4xx" ? "#020617" : "#fde68a",
                  fontWeight: statusFilter === "4xx" ? 800 : 600,
                }}
              >
                4xx Client
              </button>
            </div>
          )}

          {/* Live Stream badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.3rem 0.85rem",
              borderRadius: "9999px",
              background: "rgba(16, 185, 129, 0.18)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              fontSize: "0.72rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <span
              style={{
                width: "0.5rem",
                height: "0.5rem",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            Live Stream
          </span>
        </div>
      </div>

      {viewMode === "errors" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
          {processedErrors.map((err) => {
            const isExpanded = expandedId === err.id;
            const timeStr = new Date(err.timestamp).toLocaleTimeString();
            const statusCode = err.statusCode || 500;
            const currentTab = activeTab[err.id] || "breadcrumbs";
            const occurrences = err.windowOccurrences ?? (err.occurrences || 1);

            return (
              <div
                key={err.id}
                style={{
                  background: themeColors?.surfaceSubtle || "rgba(30, 41, 59, 0.4)",
                  border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.08)"}`,
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                  width: "100%",
                }}
              >
                <div
                  onClick={() => toggleExpand(err.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    cursor: "pointer",
                    userSelect: "none",
                    gap: "0.65rem",
                    transition: "background 0.15s ease",
                    background: isExpanded ? (themeColors?.badgeBg || "rgba(30, 41, 59, 0.7)") : "transparent",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", minWidth: 0, flex: "1 1 260px" }}>
                    <div style={{ flexShrink: 0, color: themeColors?.textMuted || "#94a3b8", display: "flex", alignItems: "center", marginTop: "0.15rem" }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 0, flex: 1 }}>
                      {/* Badges & Route header line */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            padding: "0.12rem 0.45rem",
                            borderRadius: "0.375rem",
                            border: statusCode >= 500 ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
                            backgroundColor: statusCode >= 500 ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                            color: statusCode >= 500 ? "#f87171" : "#fbbf24",
                            flexShrink: 0,
                          }}
                        >
                          {statusCode}
                        </span>

                        {/* Grouped Occurrences Badge */}
                        {occurrences > 1 && (
                          <span
                            style={{
                              backgroundColor: "rgba(99, 102, 241, 0.2)",
                              color: "#a5b4fc",
                              border: "1px solid rgba(99, 102, 241, 0.3)",
                              fontSize: "0.68rem",
                              fontFamily: "monospace",
                              fontWeight: 700,
                              padding: "0.1rem 0.45rem",
                              borderRadius: "9999px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              flexShrink: 0,
                            }}
                            title={`Grouped Issue: Occurred ${occurrences} times`}
                          >
                            <Layers size={10} />
                            x{occurrences}
                          </span>
                        )}

                        {err.method && (
                          <span
                            style={{
                              color: themeColors?.accent || "#38bdf8",
                              fontSize: "0.75rem",
                              fontFamily: "monospace",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {err.method}
                          </span>
                        )}

                        {err.route && (
                          <span
                            style={{
                              color: themeColors?.text || "#cbd5e1",
                              fontSize: "0.8rem",
                              fontFamily: "monospace",
                              wordBreak: "break-all",
                              minWidth: 0,
                            }}
                          >
                            {err.route}
                          </span>
                        )}
                      </div>

                      {/* Message body line */}
                      <div
                        style={{
                          color: "#f87171",
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                          display: "-webkit-box",
                          WebkitLineClamp: isExpanded ? "none" : 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {err.message}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      color: themeColors?.textMuted || "#64748b",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.75rem",
                      flexShrink: 0,
                      alignSelf: "flex-start",
                      marginLeft: "auto",
                    }}
                  >
                    <Clock size={12} />
                    <span style={{ fontFamily: "monospace", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{timeStr}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      padding: "0.85rem 1rem",
                      borderTop: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.06)"}`,
                      backgroundColor: "rgba(0, 0, 0, 0.35)",
                    }}
                  >
                    {/* Action Bar with cURL, JSON, and Tab Selector */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.6rem",
                        marginBottom: "0.85rem",
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        <button
                          onClick={() => setActiveTab((prev) => ({ ...prev, [err.id]: "breadcrumbs" }))}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.7rem",
                            borderRadius: "0.45rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            border: "1px solid",
                            backgroundColor: currentTab === "breadcrumbs" ? (themeColors?.badgeBg || "rgba(79, 70, 229, 0.35)") : "rgba(255, 255, 255, 0.04)",
                            color: currentTab === "breadcrumbs" ? (themeColors?.text || "#ffffff") : (themeColors?.textMuted || "#94a3b8"),
                            borderColor: currentTab === "breadcrumbs" ? (themeColors?.accent || "rgba(99, 102, 241, 0.6)") : (themeColors?.borderSubtle || "rgba(255, 255, 255, 0.1)"),
                          }}
                        >
                          Breadcrumbs ({err.filteredBreadcrumbs?.length ?? err.breadcrumbs?.length ?? 0})
                        </button>
                        {err.responseBody && (
                        <button
                          onClick={() => setActiveTab((prev) => ({ ...prev, [err.id]: "response" }))}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.7rem",
                            borderRadius: "0.45rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            border: "1px solid",
                            backgroundColor: currentTab === "response" ? "rgba(220, 38, 38, 0.35)" : "rgba(255, 255, 255, 0.04)",
                            color: currentTab === "response" ? "#fca5a5" : (themeColors?.textMuted || "#94a3b8"),
                            borderColor: currentTab === "response" ? "rgba(239, 68, 68, 0.6)" : (themeColors?.borderSubtle || "rgba(255, 255, 255, 0.1)"),
                          }}
                        >
                          Response Payload
                        </button>
                      )}
                      {err.stack && (
                        <button
                          onClick={() => setActiveTab((prev) => ({ ...prev, [err.id]: "stack" }))}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.7rem",
                            borderRadius: "0.45rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            border: "1px solid",
                            backgroundColor: currentTab === "stack" ? (themeColors?.surfaceSubtle || "#334155") : "rgba(255, 255, 255, 0.04)",
                            color: currentTab === "stack" ? (themeColors?.text || "#ffffff") : (themeColors?.textMuted || "#94a3b8"),
                            borderColor: currentTab === "stack" ? (themeColors?.accent || "#64748b") : (themeColors?.borderSubtle || "rgba(255, 255, 255, 0.1)"),
                          }}
                        >
                          Stack Trace
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab((prev) => ({ ...prev, [err.id]: "context" }))}
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.3rem 0.7rem",
                          borderRadius: "0.45rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          border: "1px solid",
                          backgroundColor: currentTab === "context" ? (themeColors?.badgeBg || "rgba(5, 150, 105, 0.35)") : "rgba(255, 255, 255, 0.04)",
                          color: currentTab === "context" ? (themeColors?.accent || "#a7f3d0") : (themeColors?.textMuted || "#94a3b8"),
                          borderColor: currentTab === "context" ? (themeColors?.accent || "rgba(16, 185, 129, 0.6)") : (themeColors?.borderSubtle || "rgba(255, 255, 255, 0.1)"),
                        }}
                      >
                        Context & Tags
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {err.route && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const curlCmd = `curl -X ${err.method || "GET"} "http://localhost:5000${err.route}"`;
                            copyText(`curl-${err.id}`, curlCmd);
                          }}
                          style={{
                            backgroundColor: themeColors?.surfaceSubtle || "rgba(30, 41, 59, 0.9)",
                            color: themeColors?.text || "#cbd5e1",
                            border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.1)"}`,
                            borderRadius: "0.375rem",
                            fontSize: "0.7rem",
                            padding: "0.25rem 0.65rem",
                            fontFamily: "monospace",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          title="Copy as cURL command to replay in terminal"
                        >
                          {copiedId === `curl-${err.id}` ? <Check size={12} color="#34d399" /> : <Terminal size={12} />}
                          {copiedId === `curl-${err.id}` ? "Copied cURL" : "Copy cURL"}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const fullError = JSON.stringify(err, null, 2);
                          copyText(`json-${err.id}`, fullError);
                        }}
                        style={{
                          backgroundColor: themeColors?.surfaceSubtle || "rgba(30, 41, 59, 0.9)",
                          color: themeColors?.text || "#cbd5e1",
                          border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.1)"}`,
                          borderRadius: "0.375rem",
                          fontSize: "0.7rem",
                          padding: "0.25rem 0.65rem",
                          fontFamily: "monospace",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        title="Copy full error metadata as JSON"
                      >
                        {copiedId === `json-${err.id}` ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                        {copiedId === `json-${err.id}` ? "Copied JSON" : "Copy JSON"}
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: Breadcrumbs Timeline */}
                  {currentTab === "breadcrumbs" && (() => {
                    const rawCrumbs = err.filteredBreadcrumbs ?? err.breadcrumbs ?? [];
                    const sortedCrumbs = [...rawCrumbs].sort((a, b) => {
                      return breadcrumbOrder === "newest" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
                    });

                    return (
                      <div style={{ marginTop: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>
                            Breadcrumbs Trail ({sortedCrumbs.length} events {timeWindow !== "all" ? `in ${timeWindow}` : "prior to crash"}):
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBreadcrumbOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
                            }}
                            style={{
                              background: themeColors?.surfaceSubtle || "rgba(30, 41, 59, 0.8)",
                              color: themeColors?.text || "#cbd5e1",
                              border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.1)"}`,
                              borderRadius: "0.375rem",
                              padding: "0.2rem 0.55rem",
                              fontSize: "0.68rem",
                              fontFamily: "monospace",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              cursor: "pointer",
                            }}
                            title="Toggle breadcrumbs sort order"
                          >
                            <ArrowUpDown size={11} color={themeColors?.textMuted || "#94a3b8"} />
                            <span>{breadcrumbOrder === "newest" ? "Newest First" : "Oldest First"}</span>
                          </button>
                        </div>

                        {sortedCrumbs.length === 0 ? (
                          <div style={{ fontSize: "0.75rem", color: themeColors?.textMuted || "#64748b", padding: "0.5rem 0", fontStyle: "italic" }}>
                            No breadcrumb events were recorded {timeWindow !== "all" ? `within ${timeWindow}` : "prior to this failure"}.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {sortedCrumbs.map((crumb, idx) => {
                              const crumbTime = new Date(crumb.timestamp).toLocaleTimeString();
                              const borderLeftColor = crumb.level === "error" ? "#ef4444" : crumb.level === "warn" ? "#f59e0b" : (themeColors?.accent || "#6366f1");
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    backgroundColor: themeColors?.surfaceSubtle || "rgba(30, 41, 59, 0.5)",
                                    border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.08)"}`,
                                    borderLeft: `4px solid ${borderLeftColor}`,
                                    borderRadius: "0.65rem",
                                    padding: "0.65rem 0.85rem",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: "0.5rem 0.75rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                                    {getBreadcrumbIcon(crumb.category)}
                                    <span
                                      style={{
                                        color: themeColors?.textMuted || "#94a3b8",
                                        fontSize: "0.65rem",
                                        fontFamily: "monospace",
                                        fontWeight: 800,
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      {crumb.category}
                                    </span>
                                  </div>

                                  <span
                                    style={{
                                      color: themeColors?.text || "#e2e8f0",
                                      fontSize: "0.78rem",
                                      fontFamily: "monospace",
                                      flex: "1 1 200px",
                                      minWidth: 0,
                                      wordBreak: "break-word",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {crumb.message}
                                  </span>

                                  {crumb.data && (
                                    <span
                                      style={{
                                        backgroundColor: "rgba(15, 23, 42, 0.8)",
                                        color: "#94a3b8",
                                        border: "1px solid rgba(255, 255, 255, 0.05)",
                                        fontSize: "0.7rem",
                                        fontFamily: "monospace",
                                        padding: "0.15rem 0.5rem",
                                        borderRadius: "0.25rem",
                                        wordBreak: "break-all",
                                        maxWidth: "100%",
                                      }}
                                    >
                                      {JSON.stringify(crumb.data)}
                                    </span>
                                  )}

                                  <div
                                    style={{
                                      color: "#64748b",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                      fontSize: "0.7rem",
                                      flexShrink: 0,
                                      marginLeft: "auto",
                                    }}
                                  >
                                    <Clock size={11} />
                                    <span style={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>{crumbTime}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TAB 2: Returned Response Payload */}
                  {currentTab === "response" && err.responseBody && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 500 }}>
                        Returned Response Payload:
                      </div>
                      <pre
                        style={{
                          fontSize: "0.75rem",
                          fontFamily: "monospace",
                          color: "#fca5a5",
                          backgroundColor: "#020617",
                          padding: "0.75rem",
                          borderRadius: "0.5rem",
                          overflowX: "auto",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {typeof err.responseBody === "object"
                          ? JSON.stringify(err.responseBody, null, 2)
                          : String(err.responseBody)}
                      </pre>
                    </div>
                  )}

                  {/* TAB 3: Stack Trace */}
                  {currentTab === "stack" && err.stack && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 500 }}>
                        Stack Trace:
                      </div>
                      <pre
                        style={{
                          fontSize: "0.75rem",
                          fontFamily: "monospace",
                          color: "#cbd5e1",
                          backgroundColor: "#020617",
                          padding: "0.75rem",
                          borderRadius: "0.5rem",
                          overflowX: "auto",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {err.stack}
                      </pre>
                    </div>
                  )}

                  {/* TAB 4: System Context & Tags */}
                  {currentTab === "context" && (
                    <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ fontSize: "0.75rem", color: themeColors?.textMuted || "#94a3b8", fontWeight: 500 }}>
                        System Context & Environment Tags:
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: "0.65rem",
                        }}
                      >
                        <div
                          style={{
                            background: themeColors?.surfaceSubtle || "rgba(15, 23, 42, 0.8)",
                            padding: "0.65rem",
                            borderRadius: "0.5rem",
                            border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.05)"}`,
                          }}
                        >
                          <div style={{ fontSize: "0.7rem", color: themeColors?.textMuted || "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
                            <Server size={11} /> OS & Architecture
                          </div>
                          <div style={{ fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 700, color: themeColors?.text || "#e2e8f0" }}>
                            {err.context?.os || "Node Host"}
                          </div>
                        </div>

                        <div
                          style={{
                            background: themeColors?.surfaceSubtle || "rgba(15, 23, 42, 0.8)",
                            padding: "0.65rem",
                            borderRadius: "0.5rem",
                            border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.05)"}`,
                          }}
                        >
                          <div style={{ fontSize: "0.7rem", color: themeColors?.textMuted || "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
                            <Cpu size={11} /> Node Runtime
                          </div>
                          <div style={{ fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 700, color: themeColors?.text || "#e2e8f0" }}>
                            {err.context?.nodeVersion || "Node.js"}
                          </div>
                        </div>

                        {err.context?.memoryMb !== undefined && (
                          <div
                            style={{
                              background: themeColors?.surfaceSubtle || "rgba(15, 23, 42, 0.8)",
                              padding: "0.65rem",
                              borderRadius: "0.5rem",
                              border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.05)"}`,
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", color: themeColors?.textMuted || "#94a3b8", marginBottom: "0.2rem" }}>Heap Memory at Crash</div>
                            <div style={{ fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 700, color: themeColors?.accent || "#38bdf8" }}>
                              {err.context.memoryMb} MB
                            </div>
                          </div>
                        )}

                        {err.fingerprint && (
                          <div
                            style={{
                              background: themeColors?.surfaceSubtle || "rgba(15, 23, 42, 0.8)",
                              padding: "0.65rem",
                              borderRadius: "0.5rem",
                              border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.05)"}`,
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", color: themeColors?.textMuted || "#94a3b8", marginBottom: "0.2rem" }}>Fingerprint Hash</div>
                            <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: themeColors?.accentSecondary || "#a5b4fc" }}>
                              {err.fingerprint}
                            </div>
                          </div>
                        )}
                      </div>

                      {err.context?.headers && (
                        <div>
                          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                            Request Headers:
                          </div>
                          <pre
                            style={{
                              fontSize: "0.7rem",
                              fontFamily: "monospace",
                              color: "#94a3b8",
                              backgroundColor: "#020617",
                              padding: "0.65rem",
                              borderRadius: "0.5rem",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              overflowX: "auto",
                              margin: 0,
                            }}
                          >
                            {JSON.stringify(err.context.headers, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}

    {/* VIEW MODE 2: Global Live Breadcrumbs Feed */}
    {viewMode === "breadcrumbs" && (() => {
      const sortedGlobalCrumbs = [...filteredGlobalBreadcrumbs].sort((a, b) => {
        return breadcrumbOrder === "newest" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
      });

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: themeColors?.textMuted || "#94a3b8", fontWeight: 500 }}>
              Showing {sortedGlobalCrumbs.length} events {timeWindow !== "all" ? `within ${timeWindow}` : "across session"}
            </span>

            <button
              onClick={() => setBreadcrumbOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
              style={{
                background: themeColors?.surfaceSubtle || "rgba(30, 41, 59, 0.8)",
                color: themeColors?.text || "#cbd5e1",
                border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.1)"}`,
                borderRadius: "0.375rem",
                padding: "0.2rem 0.55rem",
                fontSize: "0.7rem",
                fontFamily: "monospace",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                cursor: "pointer",
              }}
              title="Toggle breadcrumb sort order"
            >
              <ArrowUpDown size={11} color={themeColors?.textMuted || "#94a3b8"} />
              <span>{breadcrumbOrder === "newest" ? "Newest First" : "Oldest First"}</span>
            </button>
          </div>

          {sortedGlobalCrumbs.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: themeColors?.textMuted || "#64748b", fontSize: "0.75rem", fontStyle: "italic", background: themeColors?.surfaceSubtle || "rgba(15, 23, 42, 0.5)", borderRadius: "0.75rem", border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.05)"}` }}>
              No breadcrumb events recorded in this time window ({timeWindow}).
            </div>
          ) : (
            sortedGlobalCrumbs.map((crumb, idx) => {
              const crumbTime = new Date(crumb.timestamp).toLocaleTimeString();
              const borderLeftColor = crumb.level === "error" ? "#ef4444" : crumb.level === "warn" ? "#f59e0b" : (themeColors?.accent || "#6366f1");
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "0.5rem 0.75rem",
                    background: themeColors?.surfaceSubtle || "rgba(30, 41, 59, 0.5)",
                    border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.08)"}`,
                    borderLeft: `4px solid ${borderLeftColor}`,
                    borderRadius: "0.65rem",
                    padding: "0.65rem 0.85rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                    {getBreadcrumbIcon(crumb.category)}
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontFamily: "monospace",
                        fontWeight: 800,
                        color: themeColors?.textMuted || "#94a3b8",
                        textTransform: "uppercase",
                      }}
                    >
                      {crumb.category}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontFamily: "monospace",
                      color: themeColors?.text || "#e2e8f0",
                      flex: "1 1 200px",
                      minWidth: 0,
                      wordBreak: "break-word",
                      lineHeight: 1.4,
                    }}
                  >
                    {crumb.message}
                  </span>

                  {crumb.data && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontFamily: "monospace",
                        color: themeColors?.textMuted || "#94a3b8",
                        backgroundColor: "rgba(0, 0, 0, 0.35)",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "0.25rem",
                        border: `1px solid ${themeColors?.borderSubtle || "rgba(255, 255, 255, 0.05)"}`,
                        wordBreak: "break-all",
                        maxWidth: "100%",
                      }}
                    >
                      {JSON.stringify(crumb.data)}
                    </span>
                  )}

                  <div
                    style={{
                      color: themeColors?.textMuted || "#64748b",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      fontSize: "0.7rem",
                      flexShrink: 0,
                      marginLeft: "auto",
                    }}
                  >
                    <Clock size={11} />
                    <span style={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>{crumbTime}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    })()}
    </div>
  );
}
