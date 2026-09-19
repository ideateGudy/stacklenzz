import React, { useState } from "react";
import { CapturedErrorRecord, Breadcrumb } from "../types.js";
import { useObservability } from "../context.js";
import {
  Database,
  Trash2,
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Check,
  Search,
  RefreshCw,
  Server,
  Layers,
  Globe,
  Tag,
  Key,
  FileText,
} from "lucide-react";

export interface CrashLogsListProps {
  logs?: CapturedErrorRecord[];
  onDelete?: (id: string) => Promise<boolean>;
  onClearAll?: () => Promise<boolean>;
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

export function CrashLogsList({ logs, onDelete, onClearAll }: CrashLogsListProps) {
  const {
    dbCrashLogs: contextLogs,
    deleteCrashLog: contextDelete,
    clearAllCrashLogs: contextClearAll,
    themeColors,
    refresh,
    isLoading,
  } = useObservability();

  const activeLogs = logs || contextLogs || [];
  const handleDelete = onDelete || contextDelete;
  const handleClearAll = onClearAll || contextClearAll;

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "stack" | "breadcrumbs" | "context">>({});
  const [isClearing, setIsClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredLogs = activeLogs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.message?.toLowerCase().includes(q) ||
      log.route?.toLowerCase().includes(q) ||
      log.method?.toLowerCase().includes(q) ||
      String(log.statusCode || 500).includes(q) ||
      log.fingerprint?.toLowerCase().includes(q)
    );
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const onConfirmClearAll = async () => {
    if (activeLogs.length === 0) return;
    const ok = window.confirm(
      "Are you sure you want to permanently delete all crash logs from the database?"
    );
    if (!ok) return;

    setIsClearing(true);
    try {
      await handleClearAll();
    } finally {
      setIsClearing(false);
    }
  };

  const onConfirmDeleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await handleDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Header Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "1.25rem 1.5rem",
          borderRadius: "1rem",
          background: themeColors.card,
          border: `1px solid ${themeColors.cardBorder}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "0.75rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Database size={18} color="#ef4444" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: themeColors.text }}>
                Database Crash Logs
              </h2>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "9999px",
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#fca5a5",
                  fontWeight: 600,
                }}
              >
                {activeLogs.length} {activeLogs.length === 1 ? "Incident" : "Incidents"}
              </span>
            </div>
            <p style={{ margin: 0, marginTop: "0.2rem", fontSize: "0.8125rem", color: themeColors.textMuted }}>
              Persisted 5xx server crashes stored in your application database via <code>CrashLogAdaptor</code>
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Search box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.45rem 0.75rem",
              borderRadius: "0.5rem",
              background: "rgba(0, 0, 0, 0.2)",
              border: `1px solid ${themeColors.cardBorder}`,
            }}
          >
            <Search size={14} color={themeColors.textMuted} />
            <input
              type="text"
              placeholder="Search crash logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: themeColors.text,
                fontSize: "0.8125rem",
                width: "160px",
              }}
            />
          </div>

          <button
            onClick={() => refresh()}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 0.85rem",
              borderRadius: "0.5rem",
              background: "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${themeColors.cardBorder}`,
              color: themeColors.text,
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            Sync
          </button>

          <button
            onClick={onConfirmClearAll}
            disabled={isClearing || activeLogs.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 0.95rem",
              borderRadius: "0.5rem",
              background: activeLogs.length === 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: activeLogs.length === 0 ? themeColors.textMuted : "#fca5a5",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: activeLogs.length === 0 ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Trash2 size={14} color={activeLogs.length === 0 ? themeColors.textMuted : "#ef4444"} />
            {isClearing ? "Clearing..." : "Clear All Logs"}
          </button>
        </div>
      </div>

      {/* Crash Logs List */}
      {filteredLogs.length === 0 ? (
        <div
          style={{
            padding: "3.5rem 2rem",
            textAlign: "center",
            borderRadius: "1rem",
            background: themeColors.card,
            border: `1px dashed ${themeColors.cardBorder}`,
            color: themeColors.textMuted,
          }}
        >
          <div
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem auto",
            }}
          >
            <Database size={20} color="#10b981" />
          </div>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: themeColors.text }}>
            {searchQuery ? "No matching crash logs found" : "Database Clean — No 5xx Crashes"}
          </h3>
          <p style={{ fontSize: "0.8125rem", margin: "0.35rem 0 0 0", maxWidth: "440px", marginInline: "auto" }}>
            {searchQuery
              ? "Try adjusting your filter search criteria."
              : "No 5xx server crashes are currently stored in your database. When a server error occurs, it will automatically be captured here."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            const currentTab = activeTab[log.id] || "stack";
            const dateStr = new Date(log.timestamp).toLocaleString();
            const statusCode = log.statusCode || 500;

            return (
              <div
                key={log.id}
                style={{
                  borderRadius: "0.85rem",
                  background: themeColors.card,
                  border: `1px solid ${isExpanded ? "rgba(239, 68, 68, 0.4)" : themeColors.cardBorder}`,
                  overflow: "hidden",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Header Card Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  style={{
                    padding: "1rem 1.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    cursor: "pointer",
                    background: isExpanded ? "rgba(239, 68, 68, 0.04)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0, flex: 1 }}>
                    <button
                      style={{
                        background: "transparent",
                        border: "none",
                        color: themeColors.textMuted,
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    {/* Status Code Pill */}
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.55rem",
                        borderRadius: "0.35rem",
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#ef4444",
                        flexShrink: 0,
                      }}
                    >
                      {statusCode}
                    </div>

                    {/* Method & Route */}
                    {log.route && (
                      <div
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: themeColors.text,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          flexShrink: 0,
                        }}
                      >
                        {log.method && (
                          <span style={{ color: themeColors.accent || "#38bdf8", fontWeight: 700 }}>
                            {log.method}
                          </span>
                        )}
                        <span>{log.route}</span>
                      </div>
                    )}

                    {/* Message Preview */}
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        color: themeColors.textMuted,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {log.message}
                    </div>
                  </div>

                  {/* Right metadata & delete button */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
                    {log.occurrences && log.occurrences > 1 && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "0.35rem",
                          background: "rgba(255, 255, 255, 0.08)",
                          color: themeColors.textMuted,
                          fontWeight: 600,
                        }}
                      >
                        x{log.occurrences}
                      </span>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        fontSize: "0.75rem",
                        color: themeColors.textMuted,
                      }}
                    >
                      <Clock size={12} />
                      <span>{dateStr}</span>
                    </div>

                    {/* Individual Delete Button */}
                    <button
                      onClick={(e) => onConfirmDeleteOne(log.id, e)}
                      disabled={deletingId === log.id}
                      title="Delete this crash log from database"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "1.85rem",
                        height: "1.85rem",
                        borderRadius: "0.45rem",
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        color: "#ef4444",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: `1px solid ${themeColors.cardBorder}`,
                      background: "rgba(0, 0, 0, 0.15)",
                      padding: "1rem 1.25rem",
                    }}
                  >
                    {/* Full Message Bar */}
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "0.5rem",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        color: "#fca5a5",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        marginBottom: "1rem",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "1rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                        <AlertOctagon size={16} color="#ef4444" style={{ marginTop: "0.15rem", flexShrink: 0 }} />
                        <span>{log.message}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(log.stack || log.message, log.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          background: "rgba(0, 0, 0, 0.2)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#fff",
                          fontSize: "0.75rem",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0.35rem",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        {copiedId === log.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        <span>{copiedId === log.id ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.75rem",
                        borderBottom: `1px solid ${themeColors.cardBorder}`,
                        paddingBottom: "0.5rem",
                      }}
                    >
                      <button
                        onClick={() => setActiveTab({ ...activeTab, [log.id]: "stack" })}
                        style={{
                          background: currentTab === "stack" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                          border: "none",
                          color: currentTab === "stack" ? themeColors.text : themeColors.textMuted,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          padding: "0.35rem 0.75rem",
                          borderRadius: "0.35rem",
                          cursor: "pointer",
                        }}
                      >
                        Stack Trace
                      </button>

                      <button
                        onClick={() => setActiveTab({ ...activeTab, [log.id]: "breadcrumbs" })}
                        style={{
                          background: currentTab === "breadcrumbs" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                          border: "none",
                          color: currentTab === "breadcrumbs" ? themeColors.text : themeColors.textMuted,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          padding: "0.35rem 0.75rem",
                          borderRadius: "0.35rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <Layers size={13} />
                        <span>Breadcrumbs ({log.breadcrumbs?.length || 0})</span>
                      </button>

                      <button
                        onClick={() => setActiveTab({ ...activeTab, [log.id]: "context" })}
                        style={{
                          background: currentTab === "context" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                          border: "none",
                          color: currentTab === "context" ? themeColors.text : themeColors.textMuted,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          padding: "0.35rem 0.75rem",
                          borderRadius: "0.35rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <Server size={13} />
                        <span>Context & Environment</span>
                      </button>
                    </div>

                    {/* Tab 1: Stack Trace */}
                    {currentTab === "stack" && (
                      <pre
                        style={{
                          margin: 0,
                          padding: "0.85rem 1rem",
                          borderRadius: "0.5rem",
                          background: "rgba(0, 0, 0, 0.4)",
                          color: "#e2e8f0",
                          fontFamily: "monospace",
                          fontSize: "0.8125rem",
                          lineHeight: 1.5,
                          overflowX: "auto",
                          maxHeight: "320px",
                        }}
                      >
                        {log.stack || log.message || "No stack trace captured"}
                      </pre>
                    )}

                    {/* Tab 2: Breadcrumbs */}
                    {currentTab === "breadcrumbs" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {!log.breadcrumbs || log.breadcrumbs.length === 0 ? (
                          <div style={{ fontSize: "0.8125rem", color: themeColors.textMuted, padding: "0.5rem" }}>
                            No breadcrumbs captured prior to this crash.
                          </div>
                        ) : (
                          log.breadcrumbs.map((crumb, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.6rem",
                                padding: "0.4rem 0.65rem",
                                borderRadius: "0.35rem",
                                background: "rgba(0, 0, 0, 0.2)",
                                fontSize: "0.75rem",
                              }}
                            >
                              <div style={{ flexShrink: 0 }}>{getBreadcrumbIcon(crumb.category)}</div>
                              <span
                                style={{
                                  textTransform: "uppercase",
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  color: themeColors.textMuted,
                                  width: "42px",
                                }}
                              >
                                {crumb.category}
                              </span>
                              <span style={{ color: themeColors.text, flex: 1 }}>{crumb.message}</span>
                              <span style={{ color: themeColors.textMuted, fontSize: "0.7rem" }}>
                                {new Date(crumb.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Tab 3: Context */}
                    {currentTab === "context" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: "0.75rem",
                          fontSize: "0.8125rem",
                        }}
                      >
                        <div
                          style={{
                            padding: "0.6rem 0.85rem",
                            borderRadius: "0.5rem",
                            background: "rgba(0, 0, 0, 0.2)",
                            border: `1px solid ${themeColors.cardBorder}`,
                          }}
                        >
                          <div style={{ fontSize: "0.7rem", color: themeColors.textMuted, textTransform: "uppercase" }}>
                            OS / Architecture
                          </div>
                          <div style={{ fontWeight: 600, color: themeColors.text, marginTop: "0.2rem" }}>
                            {log.context?.os || "N/A"}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "0.6rem 0.85rem",
                            borderRadius: "0.5rem",
                            background: "rgba(0, 0, 0, 0.2)",
                            border: `1px solid ${themeColors.cardBorder}`,
                          }}
                        >
                          <div style={{ fontSize: "0.7rem", color: themeColors.textMuted, textTransform: "uppercase" }}>
                            Node Version
                          </div>
                          <div style={{ fontWeight: 600, color: themeColors.text, marginTop: "0.2rem" }}>
                            {log.context?.nodeVersion || "N/A"}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "0.6rem 0.85rem",
                            borderRadius: "0.5rem",
                            background: "rgba(0, 0, 0, 0.2)",
                            border: `1px solid ${themeColors.cardBorder}`,
                          }}
                        >
                          <div style={{ fontSize: "0.7rem", color: themeColors.textMuted, textTransform: "uppercase" }}>
                            Heap Memory Used
                          </div>
                          <div style={{ fontWeight: 600, color: themeColors.text, marginTop: "0.2rem" }}>
                            {log.context?.memoryMb ? `${log.context.memoryMb} MB` : "N/A"}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "0.6rem 0.85rem",
                            borderRadius: "0.5rem",
                            background: "rgba(0, 0, 0, 0.2)",
                            border: `1px solid ${themeColors.cardBorder}`,
                          }}
                        >
                          <div style={{ fontSize: "0.7rem", color: themeColors.textMuted, textTransform: "uppercase" }}>
                            Fingerprint
                          </div>
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.7rem",
                              color: themeColors.text,
                              marginTop: "0.2rem",
                              wordBreak: "break-all",
                            }}
                          >
                            {log.fingerprint || "N/A"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
