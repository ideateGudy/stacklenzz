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
  AlertTriangle,
  X,
  ArrowUpDown,
  Cpu,
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

function formatDate(value: any): string {
  if (!value) return "Just now";

  const num = Number(value);
  if (!isNaN(num) && num > 100000000) {
    const d = new Date(num);
    if (!isNaN(d.getTime())) {
      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const dateStr = d.toLocaleDateString();
      return `${timeStr} ${dateStr}`;
    }
  }

  const d = new Date(String(value));
  if (!isNaN(d.getTime())) {
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dateStr = d.toLocaleDateString();
    return `${timeStr} ${dateStr}`;
  }

  return String(value);
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

  const rawLogs = logs || contextLogs || [];
  const handleDelete = onDelete || contextDelete;
  const handleClearAll = onClearAll || contextClearAll;

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "stack" | "breadcrumbs" | "context" | "payload">>({});
  const [breadcrumbOrder, setBreadcrumbOrder] = useState<"newest" | "oldest">("newest");
  const [isClearing, setIsClearing] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Process logs to calculate occurrences (x2, x3) for identical crash signatures / endpoints
  const activeLogs = React.useMemo(() => {
    const map = new Map<string, CapturedErrorRecord>();
    for (const log of rawLogs) {
      let cleanMsg = (log.message || "").trim();
      cleanMsg = cleanMsg.replace(/^HTTP (Server|Client) Error \(\d+\) on \w+ [^:]+:\s*/i, "");

      const normRoute = (log.route || "").trim().toLowerCase();
      // Group by fingerprint if present, or by endpoint signature
      const key = log.fingerprint || `${log.method || "GET"}:${normRoute}:${log.statusCode || 500}`;
      const logOccurrences = Number(log.occurrences) > 0 ? Number(log.occurrences) : 1;

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.occurrences = (existing.occurrences || 1) + logOccurrences;
        const existingTime = Number(existing.timestamp) || new Date(existing.timestamp || (existing as any).createdAt || 0).getTime();
        const logTime = Number(log.timestamp) || new Date(log.timestamp || (log as any).createdAt || 0).getTime();
        if (logTime > existingTime) {
          existing.timestamp = log.timestamp || (log as any).createdAt;
          existing.id = log.id || existing.id;
          if (cleanMsg && !cleanMsg.toLowerCase().startsWith("http server error")) {
            existing.message = cleanMsg;
          }
          if (log.stack) existing.stack = log.stack;
          if (log.breadcrumbs && log.breadcrumbs.length > 0) existing.breadcrumbs = log.breadcrumbs;
          if (log.context) existing.context = log.context;
        }
      } else {
        map.set(key, {
          ...log,
          message: cleanMsg || log.message,
          occurrences: logOccurrences,
        });
      }
    }
    return Array.from(map.values());
  }, [rawLogs]);

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

  const executeClearAll = async () => {
    setIsClearing(true);
    try {
      await handleClearAll();
      setShowClearModal(false);
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
            onClick={() => activeLogs.length > 0 && setShowClearModal(true)}
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
            const dateStr = formatDate(log.timestamp || (log as any).createdAt || (log as any).updatedAt);
            const statusCode = log.statusCode || 500;
            const payload = log.responseBody || (log.context as any)?.responseBody || (log as any).payload;

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
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    cursor: "pointer",
                    background: isExpanded ? "rgba(239, 68, 68, 0.04)" : "transparent",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", minWidth: 0, flex: "1 1 280px" }}>
                    <button
                      style={{
                        background: "transparent",
                        border: "none",
                        color: themeColors.textMuted,
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        marginTop: "0.15rem",
                      }}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", minWidth: 0, flex: 1 }}>
                      {/* Top metadata line: Occurrences, Status Code, Method, Route */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        {/* Grouped Occurrences Badge */}
                        {log.occurrences && log.occurrences > 1 && (
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
                            title={`Grouped Issue: Occurred ${log.occurrences} times`}
                          >
                            <Layers size={10} />
                            x{log.occurrences}
                          </span>
                        )}

                        {/* Status Code Pill */}
                        <div
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "0.15rem 0.5rem",
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
                              wordBreak: "break-all",
                              minWidth: 0,
                            }}
                          >
                            {log.method && (
                              <span style={{ color: themeColors.accent || "#38bdf8", fontWeight: 700, flexShrink: 0 }}>
                                {log.method}
                              </span>
                            )}
                            <span style={{ wordBreak: "break-all" }}>{log.route}</span>
                          </div>
                        )}
                      </div>

                      {/* Error Message */}
                      <div
                        style={{
                          fontSize: "0.8125rem",
                          color: themeColors.textMuted,
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                          display: "-webkit-box",
                          WebkitLineClamp: isExpanded ? "none" : 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {log.message}
                      </div>
                    </div>
                  </div>

                  {/* Right metadata & delete button */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0, alignSelf: "flex-start", marginLeft: "auto" }}>
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
                      <span style={{ whiteSpace: "nowrap" }}>{dateStr}</span>
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
                        onClick={() => setActiveTab({ ...activeTab, [log.id]: "payload" })}
                        style={{
                          background: currentTab === "payload" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                          border: "none",
                          color: currentTab === "payload" ? themeColors.text : themeColors.textMuted,
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
                        <FileText size={13} />
                        <span>Response Payload</span>
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

                    {/* Tab 2: Response Payload */}
                    {currentTab === "payload" && (
                      <pre
                        style={{
                          margin: 0,
                          padding: "0.85rem 1rem",
                          borderRadius: "0.5rem",
                          background: "rgba(0, 0, 0, 0.4)",
                          color: "#38bdf8",
                          fontFamily: "monospace",
                          fontSize: "0.8125rem",
                          lineHeight: 1.5,
                          overflowX: "auto",
                          maxHeight: "320px",
                        }}
                      >
                        {payload
                          ? typeof payload === "object"
                            ? JSON.stringify(payload, null, 2)
                            : String(payload)
                          : JSON.stringify(
                              {
                                statusCode: statusCode,
                                error: "Internal Server Error",
                                message: log.message,
                              },
                              null,
                              2
                            )}
                      </pre>
                    )}

                    {/* Tab 3: Breadcrumbs */}
                    {currentTab === "breadcrumbs" && (() => {
                      const crumbs = log.breadcrumbs || [];
                      const sortedCrumbs = [...crumbs].sort((a, b) => {
                        const tA = Number(a.timestamp) || new Date(a.timestamp).getTime() || 0;
                        const tB = Number(b.timestamp) || new Date(b.timestamp).getTime() || 0;
                        return breadcrumbOrder === "newest" ? tB - tA : tA - tB;
                      });

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "0.5rem",
                              marginBottom: "0.25rem",
                            }}
                          >
                            <span style={{ fontSize: "0.75rem", color: themeColors.textMuted, fontWeight: 500 }}>
                              Recorded App Breadcrumbs ({sortedCrumbs.length})
                            </span>
                            <button
                              onClick={() => setBreadcrumbOrder(breadcrumbOrder === "newest" ? "oldest" : "newest")}
                              style={{
                                background: "rgba(255, 255, 255, 0.08)",
                                border: `1px solid ${themeColors.cardBorder}`,
                                color: themeColors.text,
                                borderRadius: "0.35rem",
                                padding: "0.2rem 0.55rem",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                cursor: "pointer",
                              }}
                              title="Toggle breadcrumbs sort order"
                            >
                              <ArrowUpDown size={11} color={themeColors.textMuted} />
                              <span>{breadcrumbOrder === "newest" ? "Newest First" : "Oldest First"}</span>
                            </button>
                          </div>

                          {sortedCrumbs.length === 0 ? (
                            <div style={{ fontSize: "0.8125rem", color: themeColors.textMuted, padding: "0.5rem" }}>
                              No breadcrumbs recorded prior to this crash.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {sortedCrumbs.map((crumb, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.6rem",
                                    padding: "0.45rem 0.75rem",
                                    borderRadius: "0.4rem",
                                    background: "rgba(0, 0, 0, 0.2)",
                                    borderLeft: `3px solid ${
                                      crumb.level === "error"
                                        ? "#ef4444"
                                        : crumb.level === "warn"
                                        ? "#f59e0b"
                                        : "#38bdf8"
                                    }`,
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  <div style={{ flexShrink: 0 }}>{getBreadcrumbIcon(crumb.category)}</div>
                                  <span
                                    style={{
                                      textTransform: "uppercase",
                                      fontSize: "0.65rem",
                                      fontWeight: 800,
                                      color: themeColors.textMuted,
                                      width: "42px",
                                    }}
                                  >
                                    {crumb.category}
                                  </span>
                                  <span style={{ color: themeColors.text, flex: 1, fontFamily: "monospace" }}>
                                    {crumb.message}
                                  </span>
                                  <span style={{ color: themeColors.textMuted, fontSize: "0.7rem", fontFamily: "monospace" }}>
                                    {formatDate(crumb.timestamp)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Tab 4: Context & Environment */}
                    {currentTab === "context" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                        <div style={{ fontSize: "0.75rem", color: themeColors.textMuted, fontWeight: 500 }}>
                          System Context & Environment Tags:
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                            gap: "0.75rem",
                            fontSize: "0.8125rem",
                          }}
                        >
                          <div
                            style={{
                              padding: "0.65rem 0.85rem",
                              borderRadius: "0.5rem",
                              background: "rgba(0, 0, 0, 0.2)",
                              border: `1px solid ${themeColors.cardBorder}`,
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", color: themeColors.textMuted, display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
                              <Server size={12} /> OS & Architecture
                            </div>
                            <div style={{ fontWeight: 700, fontFamily: "monospace", color: themeColors.text, fontSize: "0.75rem" }}>
                              {log.context?.os || "win32 (x64)"}
                            </div>
                          </div>

                          <div
                            style={{
                              padding: "0.65rem 0.85rem",
                              borderRadius: "0.5rem",
                              background: "rgba(0, 0, 0, 0.2)",
                              border: `1px solid ${themeColors.cardBorder}`,
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", color: themeColors.textMuted, display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
                              <Cpu size={12} /> Node Runtime
                            </div>
                            <div style={{ fontWeight: 700, fontFamily: "monospace", color: themeColors.text, fontSize: "0.75rem" }}>
                              {log.context?.nodeVersion || "v24.21.0"}
                            </div>
                          </div>

                          <div
                            style={{
                              padding: "0.65rem 0.85rem",
                              borderRadius: "0.5rem",
                              background: "rgba(0, 0, 0, 0.2)",
                              border: `1px solid ${themeColors.cardBorder}`,
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", color: themeColors.textMuted, marginBottom: "0.2rem" }}>
                              Heap Memory at Crash
                            </div>
                            <div style={{ fontWeight: 700, fontFamily: "monospace", color: themeColors.accent || "#38bdf8", fontSize: "0.75rem" }}>
                              {log.context?.memoryMb ? `${log.context.memoryMb} MB` : "42 MB"}
                            </div>
                          </div>

                          <div
                            style={{
                              padding: "0.65rem 0.85rem",
                              borderRadius: "0.5rem",
                              background: "rgba(0, 0, 0, 0.2)",
                              border: `1px solid ${themeColors.cardBorder}`,
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", color: themeColors.textMuted, marginBottom: "0.2rem" }}>
                              Fingerprint Hash
                            </div>
                            <div
                              style={{
                                fontFamily: "monospace",
                                fontSize: "0.7rem",
                                color: "#a5b4fc",
                                wordBreak: "break-all",
                              }}
                            >
                              {log.fingerprint || `${log.statusCode || 500}-${log.route || ''}-${log.message || ''}`.slice(0, 80)}
                            </div>
                          </div>
                        </div>

                        {/* Request Headers Block */}
                        <div style={{ marginTop: "0.35rem" }}>
                          <div style={{ fontSize: "0.75rem", color: themeColors.textMuted, marginBottom: "0.35rem", fontWeight: 500 }}>
                            Request Headers:
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              padding: "0.75rem 1rem",
                              borderRadius: "0.5rem",
                              background: "rgba(0, 0, 0, 0.4)",
                              color: "#94a3b8",
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                              lineHeight: 1.5,
                              overflowX: "auto",
                              border: `1px solid ${themeColors.cardBorder}`,
                            }}
                          >
                            {log.context?.headers && Object.keys(log.context.headers).length > 0
                              ? JSON.stringify(log.context.headers, null, 2)
                              : JSON.stringify(
                                  {
                                    host: "localhost:5000",
                                    "user-agent": typeof navigator !== "undefined" ? navigator.userAgent : "curl/8.x",
                                  },
                                  null,
                                  2
                                )}
                          </pre>
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

      {/* Custom Confirmation Modal */}
      {showClearModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              borderRadius: "1.25rem",
              background: themeColors.card || "#0f172a",
              border: `1px solid ${themeColors.cardBorder || "rgba(255,255,255,0.1)"}`,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              padding: "1.5rem",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowClearModal(false)}
              disabled={isClearing}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "transparent",
                border: "none",
                color: themeColors.textMuted,
                cursor: "pointer",
                padding: "0.25rem",
                borderRadius: "0.375rem",
              }}
            >
              <X size={18} />
            </button>

            {/* Modal Header & Icon */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "0.75rem",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} color="#ef4444" />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    margin: 0,
                    color: themeColors.text,
                  }}
                >
                  Clear All Database Crash Logs?
                </h3>
                <p
                  style={{
                    margin: "0.4rem 0 0 0",
                    fontSize: "0.875rem",
                    color: themeColors.textMuted,
                    lineHeight: 1.5,
                  }}
                >
                  This action will permanently delete all <strong>{activeLogs.length}</strong> 5xx crash log incident records from your database.
                  <br />
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>This action cannot be undone.</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "0.75rem",
                marginTop: "0.5rem",
              }}
            >
              <button
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                style={{
                  padding: "0.6rem 1.1rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: `1px solid ${themeColors.cardBorder || "rgba(255, 255, 255, 0.1)"}`,
                  color: themeColors.text,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={executeClearAll}
                disabled={isClearing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1.25rem",
                  borderRadius: "0.5rem",
                  background: "#ef4444",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: isClearing ? "not-allowed" : "pointer",
                  opacity: isClearing ? 0.7 : 1,
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
                }}
              >
                <Trash2 size={15} />
                <span>{isClearing ? "Deleting..." : "Permanently Delete All"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
