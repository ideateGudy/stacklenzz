import React, { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Globe,
  Gauge,
  AlertTriangle,
  Cpu,
  SquareDashedBottom,
  ChevronDown,
  Palette,
  Check,
  Database,
} from "lucide-react";
import { useObservability } from "../context.js";
import { RUNTIME_THEMES, RuntimeTheme } from "../themes.js";

export type DashboardTemplateType =
  | "full"
  | "api"
  | "performance"
  | "errors"
  | "runtime"
  | "minimal"
  | "crash-logs";

export interface DashboardSwitcherProps {
  currentDashboard: DashboardTemplateType;
  onChangeDashboard: (type: DashboardTemplateType) => void;
  endpoint?: string;
}

export const DASHBOARD_TEMPLATES: {
  id: DashboardTemplateType;
  label: string;
  shortDesc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "full",
    label: "Full Suite",
    shortDesc: "Complete metrics, traffic, latencies, runtime & errors",
    icon: <LayoutDashboard size={15} color="#6366f1" />,
  },
  {
    id: "api",
    label: "API Overview",
    shortDesc: "Traffic volume, HTTP status distribution & endpoints",
    icon: <Globe size={15} color="#38bdf8" />,
  },
  {
    id: "performance",
    label: "Performance",
    shortDesc: "P50/P95/P99 latency gauge & route response times",
    icon: <Gauge size={15} color="#a855f7" />,
  },
  {
    id: "errors",
    label: "Errors & Failures",
    shortDesc: "Aggregated exceptions, breadcrumbs & fingerprints",
    icon: <AlertTriangle size={15} color="#f43f5e" />,
  },
  {
    id: "crash-logs",
    label: "Database Crash Logs",
    shortDesc: "Persisted 5xx server crashes stored in database",
    icon: <Database size={15} color="#ef4444" />,
  },
  {
    id: "runtime",
    label: "Node Runtime",
    shortDesc: "CPU load, RSS/Heap memory & event loop lag",
    icon: <Cpu size={15} color="#f59e0b" />,
  },
  {
    id: "minimal",
    label: "Minimal Widget",
    shortDesc: "Compact summary card for existing admin sidebars",
    icon: <SquareDashedBottom size={15} color="#10b981" />,
  },
];

export function DashboardSwitcher({
  currentDashboard,
  onChangeDashboard,
  endpoint,
}: DashboardSwitcherProps) {
  const { theme, setTheme, themeColors } = useObservability();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<"left" | "right">("right");
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isThemeMenuOpen && themeMenuRef.current) {
      const rect = themeMenuRef.current.getBoundingClientRect();
      // If the theme switcher button is near the left edge (< 260px), align left with left offset
      if (rect.left < 260) {
        setMenuPlacement("left");
      } else {
        setMenuPlacement("right");
      }
    }
  }, [isThemeMenuOpen]);

  const activeTheme = RUNTIME_THEMES[theme] || RUNTIME_THEMES["tokyo-night"];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.85rem",
        padding: "0.75rem 1.25rem",
        marginBottom: "1.25rem",
        background: activeTheme.switcherBg,
        border: `1px solid ${activeTheme.cardBorder}`,
        borderRadius: "0.75rem",
        boxShadow: "0 4px 20px -5px rgba(0, 0, 0, 0.4)",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100%",
        position: "relative",
        zIndex: 50,
        overflow: "visible",
      }}
    >
      {/* Selector & Tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", minWidth: 0, maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
          <span
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              fontWeight: 700,
              color: activeTheme.accent,
              letterSpacing: "0.06em",
            }}
          >
            Dashboard:
          </span>
        </div>

        {/* Tab Pills for wide screens */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap", minWidth: 0, maxWidth: "100%" }}>
          {DASHBOARD_TEMPLATES.map((tmpl) => {
            const isActive = tmpl.id === currentDashboard;
            return (
              <button
                key={tmpl.id}
                onClick={() => onChangeDashboard(tmpl.id)}
                title={tmpl.shortDesc}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.78rem",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#ffffff" : activeTheme.textMuted,
                  background: isActive
                    ? `linear-gradient(135deg, ${activeTheme.accent} 0%, ${activeTheme.accentSecondary} 100%)`
                    : "rgba(255, 255, 255, 0.04)",
                  border: `1px solid ${isActive ? activeTheme.accent : "rgba(255, 255, 255, 0.08)"}`,
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease-in-out",
                  boxShadow: isActive ? `0 0 12px ${activeTheme.glow}` : "none",
                  whiteSpace: "nowrap",
                }}
              >
                {tmpl.icon}
                <span>{tmpl.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right controls: Theme Switcher & Endpoint Live Indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", minWidth: 0, maxWidth: "100%" }}>
        {/* 6 Runtime Themes Dropdown Switcher */}
        <div style={{ position: "relative", flexShrink: 0 }} ref={themeMenuRef}>
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              background: "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${isThemeMenuOpen ? activeTheme.accent : "rgba(255, 255, 255, 0.1)"}`,
              borderRadius: "0.45rem",
              padding: "0.3rem 0.65rem",
              color: activeTheme.text,
              fontSize: "0.76rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Switch Dashboard Theme"
          >
            <Palette size={13} color={activeTheme.accent} />
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: activeTheme.accent,
                boxShadow: `0 0 6px ${activeTheme.accent}`,
              }}
            />
            <span>{activeTheme.name}</span>
            <ChevronDown
              size={12}
              style={{
                transform: isThemeMenuOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.15s ease",
              }}
            />
          </button>

          {isThemeMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: menuPlacement === "left" ? 0 : "auto",
                right: menuPlacement === "right" ? 0 : "auto",
                zIndex: 9999,
                width: "250px",
                maxWidth: "calc(100vw - 2.5rem)",
                boxSizing: "border-box",
                maxHeight: "min(420px, calc(100vh - 120px))",
                overflowY: "auto",
                backgroundColor: activeTheme.background,
                border: `1px solid ${activeTheme.cardBorder}`,
                borderRadius: "0.65rem",
                padding: "0.45rem",
                boxShadow: "0 20px 40px -5px rgba(0, 0, 0, 0.85), 0 0 20px rgba(0, 0, 0, 0.6)",
              }}
            >
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: activeTheme.textMuted,
                  padding: "0.35rem 0.5rem 0.2rem",
                }}
              >
                Runtime Themes (6 Built-in)
              </div>
              {(Object.keys(RUNTIME_THEMES) as RuntimeTheme[]).map((themeKey) => {
                const t = RUNTIME_THEMES[themeKey];
                const isSelected = theme === themeKey;
                return (
                  <button
                    key={themeKey}
                    onClick={() => {
                      setTheme(themeKey);
                      setIsThemeMenuOpen(false);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.45rem 0.6rem",
                      borderRadius: "0.375rem",
                      border: "none",
                      background: isSelected ? t.badgeBg : "transparent",
                      color: isSelected ? "#ffffff" : t.text,
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      textAlign: "left",
                      transition: "all 0.12s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          width: "9px",
                          height: "9px",
                          borderRadius: "50%",
                          backgroundColor: t.accent,
                          boxShadow: isSelected ? `0 0 8px ${t.accent}` : "none",
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: isSelected ? 600 : 400 }}>{t.name}</div>
                        <div style={{ fontSize: "0.68rem", color: t.textMuted }}>{t.description}</div>
                      </div>
                    </div>
                    {isSelected && <Check size={13} color={t.accent} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Endpoint Live Indicator - Mobile Safe with text ellipsis */}
        {endpoint && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              fontSize: "0.72rem",
              color: activeTheme.textMuted,
              background: "rgba(0, 0, 0, 0.25)",
              padding: "0.25rem 0.65rem",
              borderRadius: "0.375rem",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
            title={endpoint}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 8px #10b981",
                flexShrink: 0,
              }}
            />
            <span style={{ flexShrink: 0 }}>Telemetry:</span>
            <code
              style={{
                color: activeTheme.accent,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "240px",
                display: "inline-block",
              }}
            >
              {endpoint}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
