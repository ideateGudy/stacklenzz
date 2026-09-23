"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Layers,
  Terminal,
  Cpu,
  Server,
  Code,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Zap,
  Gauge,
  AlertTriangle,
  Play,
  GitBranch,
  ChevronDown,
  CheckCircle2,
  Menu,
  X,
  Search,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StacklenzzLogo } from "../components/StacklenzzLogo";
import { CURRENT_PROJECT_VERSION, AVAILABLE_VERSIONS } from "./version";

export default function DocumentationPage() {
  const [selectedVersion, setSelectedVersion] = useState<string>(CURRENT_PROJECT_VERSION);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string>("quickstart");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [installPm, setInstallPm] = useState<"cli" | "npm" | "pnpm" | "bun" | "yarn">("cli");

  // Keyboard shortcut listener for Ctrl+K / Cmd+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  // Auto-highlight sidebar section as user scrolls through docs-main-scroll-container
  useEffect(() => {
    const container = document.getElementById("docs-main-scroll-container");
    if (!container) return;

    const allSectionIds = navItems.flatMap((g) => g.items.map((item) => item.id));

    const handleScroll = () => {
      const containerTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      // If scrolled near bottom of container, highlight the last section
      if (container.scrollHeight - (containerTop + containerHeight) < 80) {
        setActiveSection(allSectionIds[allSectionIds.length - 1]);
        return;
      }

      let currentSection = allSectionIds[0];
      for (const id of allSectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const relativeTop = el.offsetTop - container.offsetTop;
          if (containerTop >= relativeTop - 120) {
            currentSection = id;
          }
        }
      }
      setActiveSection(currentSection);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const navItems = [
    {
      group: "Getting Started",
      items: [
        { id: "overview", label: "Overview & Architecture", icon: <Layers size={16} /> },
        { id: "quickstart", label: "Quick Start Guide", icon: <Zap size={16} /> },
        { id: "installation", label: "Installation & CLI Options", icon: <Terminal size={16} /> },
      ],
    },
    {
      group: "Frontend & UI Dashboards",
      items: [
        { id: "ui-dashboard", label: "React & Next.js UI", icon: <Activity size={16} /> },
        { id: "dashboard-themes", label: "6 Runtime Themes", icon: <Sparkles size={16} /> },
        { id: "cli-commands", label: "CLI Commands Reference", icon: <Code size={16} /> },
      ],
    },
    {
      group: "Backend SDK",
      items: [
        { id: "express", label: "Express Instrumentation", icon: <Server size={16} /> },
        { id: "nestjs", label: "NestJS Module Setup", icon: <Cpu size={16} /> },
        { id: "sdk-advanced", label: "Advanced SDK Features & APIs", icon: <Zap size={16} /> },
        { id: "metrics-tracing", label: "Metrics & OpenTelemetry", icon: <Gauge size={16} /> },
        { id: "error-intel", label: "Error Intelligence & Breadcrumbs", icon: <AlertTriangle size={16} /> },
      ],
    },
    {
      group: "Production & Deploy",
      items: [
        { id: "security", label: "Auth & Middleware Security", icon: <Shield size={16} /> },
        { id: "deployment", label: "Hosting Live on Vercel / Cloud", icon: <ExternalLink size={16} /> },
      ],
    },
  ];

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const target = document.getElementById(id);
    const container = document.getElementById("docs-main-scroll-container");
    if (target && container) {
      const topPos = target.offsetTop - container.offsetTop;
      container.scrollTo({ top: topPos - 20, behavior: "smooth" });
    } else if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen w-screen max-w-[100vw] overflow-hidden bg-background text-slate-100">
      {/* Top Navbar: Fixed / Static */}
      <header className="relative z-50 shrink-0 h-[60px] flex items-center justify-between px-5 bg-[#090d16]/95 backdrop-blur-md border-b border-white/10 w-full">
        <div className="flex items-center gap-3">
          {/* Desktop Sidebar Expand/Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`hidden lg:flex items-center justify-center bg-white/5 border border-white/10 rounded-md p-1.5 cursor-pointer transition-all duration-150 ${sidebarCollapsed ? "text-indigo-400" : "text-slate-400"}`}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse to Icons Only"}
            aria-label="Toggle Sidebar Width"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <PanelLeft size={18} />}
          </button>

          {/* Mobile menu hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden items-center justify-center bg-white/5 border border-white/10 rounded-md p-1.5 text-white cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 sm:gap-3 no-underline text-inherit"
              title="Return to Home"
            >
              <StacklenzzLogo size={34} />
              <div className="hidden sm:block font-extrabold text-base tracking-tight text-white">
                Stacklenzz
              </div>
            </Link>
            <div className="hidden sm:block relative">
              <button
                onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/25 rounded-md px-2 py-0.5 text-indigo-400 text-[11px] font-semibold cursor-pointer"
              >
                <span>{selectedVersion}</span>
                <ChevronDown size={11} className={isVersionDropdownOpen ? "rotate-180" : ""} />
              </button>

              {isVersionDropdownOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[170px] bg-slate-900 border border-white/10 rounded-lg p-1.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)]">
                  <div className="text-[10px] font-bold uppercase text-slate-500 px-2 pt-1.5 pb-1">
                    Select Version
                  </div>
                  {AVAILABLE_VERSIONS.map((item) => (
                    <button
                      key={item.version}
                      onClick={() => {
                        setSelectedVersion(item.version);
                        setIsVersionDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md border-none text-xs cursor-pointer text-left ${
                        selectedVersion === item.version
                          ? "bg-indigo-500/20 text-white font-semibold"
                          : "bg-transparent text-slate-400 font-normal"
                      }`}
                    >
                      <span>{item.label}</span>
                      {selectedVersion === item.version && <CheckCircle2 size={12} className="text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Search Button (trigger for modal or direct search) */}
        <div className="flex-1 max-w-[420px] mx-2 sm:mx-4">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between bg-white/[0.04] border border-white/[0.09] rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-slate-400 text-xs sm:text-[13px] cursor-pointer hover:bg-white/[0.08] transition-all"
          >
            <div className="flex items-center gap-2">
              <Search size={15} className="text-indigo-400" />
              <span className="hidden sm:inline">Search docs...</span>
              <span className="sm:hidden text-slate-400">Search...</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 bg-white/[0.08] border border-white/[0.12] rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
              <span>Ctrl</span>
              <span>K</span>
            </div>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link
            href="/docs/observability-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 text-white text-[11px] sm:text-xs font-semibold no-underline whitespace-nowrap"
          >
            <Play size={13} /> <span className="hidden sm:inline">Demo Console</span><span className="sm:hidden">Demo</span>
          </Link>
          <a
            href="https://github.com/ideateGudy/stacklenzz"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-medium no-underline hover:bg-white/10 transition-colors"
          >
            <GitBranch size={14} /> GitHub
          </a>
        </div>
      </header>

      {/* Main Documentation Layout: Takes remaining viewport height with independent Main Scroll */}
      <div className="flex w-full max-w-[1600px] mx-auto flex-1 h-[calc(100vh-60px)] max-h-[calc(100vh-60px)] overflow-hidden relative">
        {/* Mobile Backdrop Overlay when Drawer is open */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-x-0 bottom-0 top-[60px] bg-black/75 backdrop-blur-sm z-[39]"
            />
          )}
        </AnimatePresence>

        {/* Sidebar Navigation: Static / Non-scrolling with the page - Expandable / Collapsible */}
        <aside
          style={{ width: sidebarCollapsed ? "68px" : "260px" }}
          className={`shrink-0 h-full overflow-y-auto overflow-x-hidden border-r border-white/5 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? "p-5 px-2" : "p-6 px-4"
          } max-lg:fixed max-lg:top-[60px] max-lg:left-0 max-lg:z-40 max-lg:bg-[#090d16]/95 max-lg:backdrop-blur-xl max-lg:h-[calc(100vh-60px)] max-lg:shadow-2xl ${
            mobileMenuOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
          }`}
        >
          <div className={`flex flex-col ${sidebarCollapsed ? "gap-4" : "gap-6"}`}>
            {navItems.map((group, idx) => (
              <div key={idx}>
                {!sidebarCollapsed ? (
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 pl-2">
                    {group.group}
                  </div>
                ) : (
                  <div className="h-px bg-white/5 my-1.5 mx-1" title={group.group} />
                )}
                <div className="flex flex-col gap-1">
                  {group.items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`flex items-center gap-2.5 rounded-lg border-none text-[13px] cursor-pointer text-left transition-all duration-150 w-full ${
                          sidebarCollapsed ? "justify-center p-2.5" : "justify-start py-2 px-3"
                        } ${
                          isActive
                            ? "font-semibold text-white bg-indigo-500/15"
                            : "font-normal text-slate-400 bg-transparent hover:bg-white/5"
                        }`}
                      >
                        <span className={`flex items-center justify-center ${isActive ? "text-indigo-400" : "text-slate-500"}`}>
                          {item.icon}
                        </span>
                        {!sidebarCollapsed && (
                          <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                            {item.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Content Area: The ONLY area that scrolls down */}
        <main
          id="docs-main-scroll-container"
          className="flex-1 min-w-0 w-full max-w-full h-full overflow-y-auto overflow-x-hidden p-10 pb-24 max-lg:p-6 max-lg:pb-16 leading-relaxed docs-main-content"
        >
          {/* Section: Overview */}
          <section id="overview" style={{ marginBottom: "3.5rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.25rem 0.65rem",
                borderRadius: "9999px",
                background: "rgba(59, 130, 246, 0.12)",
                color: "#60a5fa",
                fontSize: "0.75rem",
                fontWeight: 600,
                marginBottom: "0.75rem",
                border: "1px solid rgba(59, 130, 246, 0.25)",
              }}
            >
              <Sparkles size={13} /> Complete Observability Pipeline
            </div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 800, margin: "0 0 0.75rem 0", letterSpacing: "-0.03em" }}>
              Developer-First Observability
            </h1>
            <p style={{ fontSize: "1.05rem", color: "#94a3b8", margin: "0 0 1.5rem 0" }}>
              A turnkey monitoring system for Express and NestJS backends, paired with ready-to-mount React & Next.js admin dashboards. Collect Prometheus metrics, OpenTelemetry traces, and intelligent error fingerprints with zero external framework lock-in.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", margin: "1.5rem 0" }}>
              <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "0.75rem", padding: "1.25rem" }}>
                <div style={{ color: "#818cf8", marginBottom: "0.5rem" }}><Server size={22} /></div>
                <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1rem" }}>Backend Core SDK</h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
                  One-line middleware setup for Express and NestJS. Exposes <code>/metrics</code> for Prometheus and <code>/api/observability/stats</code>.
                </p>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "0.75rem", padding: "1.25rem" }}>
                <div style={{ color: "#38bdf8", marginBottom: "0.5rem" }}><Activity size={22} /></div>
                <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1rem" }}>React Dashboard UI</h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
                  6 pre-built dashboard layouts, 6 runtime color themes, deep error inspector with stack traces and breadcrumb timelines.
                </p>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "0.75rem", padding: "1.25rem" }}>
                <div style={{ color: "#34d399", marginBottom: "0.5rem" }}><Terminal size={22} /></div>
                <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1rem" }}>Zero-Config CLI</h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
                  Detects Next.js App/Pages Router and Vite. Installs UI routes, initializes configs, and validates connectivity with <code>doctor</code>.
                </p>
              </div>
            </div>
          </section>

          {/* Section: Quick Start */}
          <section id="quickstart" style={{ marginBottom: "3.5rem" }}>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "0 0 1rem 0" }}>⚡️ Quick Start in 3 Steps</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "0.75rem", padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.95rem" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem" }}>1</span>
                    Instrument Your Backend
                  </div>
                  <button
                    onClick={() => copyToClipboard("npm install @stacklenzz/server", "code-step1")}
                    style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem" }}
                  >
                    {copiedCode === "code-step1" ? <Check size={14} color="#10b981" /> : <Copy size={14} />} Copy
                  </button>
                </div>
                <pre style={{ margin: 0, padding: "0.75rem 1rem", backgroundColor: "#020617", borderRadius: "0.5rem", color: "#e2e8f0", fontFamily: "monospace", fontSize: "0.82rem" }}>
                  npm install @stacklenzz/server
                </pre>
              </div>

              <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "0.75rem", padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.95rem" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem" }}>2</span>
                    Scaffold Frontend Dashboard
                  </div>
                  <button
                    onClick={() => copyToClipboard("npx stacklenzz dashboard", "code-step2")}
                    style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem" }}
                  >
                    {copiedCode === "code-step2" ? <Check size={14} color="#10b981" /> : <Copy size={14} />} Copy
                  </button>
                </div>
                <pre style={{ margin: 0, padding: "0.75rem 1rem", backgroundColor: "#020617", borderRadius: "0.5rem", color: "#e2e8f0", fontFamily: "monospace", fontSize: "0.82rem" }}>
                  npx stacklenzz dashboard
                </pre>
              </div>

              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5">
                <div className="font-bold text-[15px] mb-1.5 flex items-center gap-2">
                  <span className="w-[22px] h-[22px] rounded-full bg-emerald-600 flex items-center justify-center text-[11px]">3</span>
                  View Live Protected Route
                </div>
                <p className="m-0 mb-3 text-slate-400 text-[13.5px]">
                  Navigate to your frontend application to inspect live traffic, latencies, and errors in real-time:
                </p>
                <div>
                  <Link
                    href="/docs/observability-dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold no-underline hover:bg-indigo-500 transition-colors"
                  >
                    Open Live Demo Console <ExternalLink size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Installation */}
          <section id="installation" className="mb-14">
            <h2 className="text-2xl font-bold m-0 mb-4">📦 Installation Options</h2>
            <p className="text-slate-400 m-0 mb-4 text-[14px]">
              Choose your preferred installation method:
            </p>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {(["cli", "npm", "pnpm", "bun", "yarn"] as const).map((pm) => (
                <button
                  key={pm}
                  onClick={() => setInstallPm(pm)}
                  className={`px-3 py-1.5 rounded-md border text-[12px] font-semibold cursor-pointer uppercase transition-colors ${
                    installPm === pm
                      ? "border-indigo-500 bg-indigo-500/20 text-white"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {pm === "cli" ? "CLI Auto (Recommended)" : pm}
                </button>
              ))}
            </div>

            <div className="bg-slate-950 border border-white/10 rounded-xl p-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11.5px] text-slate-500 font-mono">Terminal</span>
                <button
                  onClick={() => {
                    const cmd =
                      installPm === "cli"
                        ? "npx stacklenzz dashboard"
                        : installPm === "pnpm"
                        ? "pnpm add @stacklenzz/server @stacklenzz/ui lucide-react"
                        : installPm === "bun"
                        ? "bun add @stacklenzz/server @stacklenzz/ui lucide-react"
                        : installPm === "yarn"
                        ? "yarn add @stacklenzz/server @stacklenzz/ui lucide-react"
                        : "npm install @stacklenzz/server @stacklenzz/ui lucide-react";
                    copyToClipboard(cmd, "install-cmd");
                  }}
                  className="bg-transparent border-none text-slate-400 cursor-pointer flex items-center gap-1.5 text-[11.5px] hover:text-white"
                >
                  {copiedCode === "install-cmd" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />} Copy
                </button>
              </div>

              <pre className="m-0 text-slate-50 font-mono text-[13.5px] whitespace-pre-wrap">
                {installPm === "cli" && `# 1. Scaffold Dashboard Route\nnpx stacklenzz dashboard\n\n# 2. Run Doctor to Validate Connection\nnpx stacklenzz doctor`}
                {installPm === "npm" && `npm install @stacklenzz/server @stacklenzz/ui lucide-react`}
                {installPm === "pnpm" && `pnpm add @stacklenzz/server @stacklenzz/ui lucide-react`}
                {installPm === "bun" && `bun add @stacklenzz/server @stacklenzz/ui lucide-react`}
                {installPm === "yarn" && `yarn add @stacklenzz/server @stacklenzz/ui lucide-react`}
              </pre>
            </div>
          </section>

          {/* Section: UI Dashboard */}
          <section id="ui-dashboard" className="mb-14">
            <h2 className="text-2xl font-bold m-0 mb-3">React & Next.js UI Dashboard</h2>
            <p className="text-slate-400 m-0 mb-4 text-[14px]">
              Render the unified <code>&lt;ObservabilityDashboard /&gt;</code> inside any client component:
            </p>
            <pre className="m-0 p-4 bg-slate-950 border border-white/10 rounded-xl text-slate-50 font-mono text-[13px] leading-relaxed overflow-x-auto">
{`"use client";

import { ObservabilityDashboard } from "@stacklenzz/ui";

export default function AdminObservabilityPage() {
  return (
    <main className="min-h-screen bg-background">
      <ObservabilityDashboard
        config={{
          endpoint: "http://localhost:5000/api/observability/stats",
          refreshIntervalMs: 5000,
        }}
        defaultDashboard="full"
        showSwitcher={true}
      />
    </main>
  );
}`}
            </pre>
          </section>

          {/* Section: Dashboard Themes */}
          <section id="dashboard-themes" className="mb-14">
            <h2 className="text-2xl font-bold m-0 mb-3">6 Built-in Runtime Themes & State Management</h2>
            <p className="text-slate-400 m-0 mb-4 text-[14px]">
              Switch themes live on the UI or configure your preferred default aesthetic. Powered by zero-dependency <strong>React Context</strong> with automatic <code>localStorage</code> persistence (<code>stacklenzz_theme</code>):
            </p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 mb-4">
              {[
                { name: "Tokyo Night", id: "tokyo-night", color: "#7aa2f7", desc: "Deep indigo & neon cyan" },
                { name: "Nord", id: "nord", color: "#88c0d0", desc: "Arctic cool frost blues" },
                { name: "Dracula", id: "dracula", color: "#bd93f9", desc: "Vibrant purple & pink accents" },
                { name: "Catppuccin Mocha", id: "catppuccin", color: "#cba6f7", desc: "Soothing pastel dark palette" },
                { name: "Emerald Terminal", id: "emerald-terminal", color: "#10b981", desc: "Monochrome hacker terminal" },
                { name: "Cyberpunk", id: "cyberpunk", color: "#f43f5e", desc: "High-contrast neon pink" },
              ].map((t) => (
                <div key={t.id} className="bg-white/5 border border-white/5 rounded-lg p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }}></span>
                    <span className="font-semibold text-[13.5px]">{t.name}</span>
                  </div>
                  <div className="text-[12px] text-slate-400">{t.desc}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-950 border border-white/10 rounded-xl p-4">
              <div className="text-[12.5px] font-bold text-indigo-400 uppercase mb-1.5">
                ⚡️ Redux Toolkit &amp; LocalStorage Persistence
              </div>
              <p className="m-0 text-[13px] text-slate-300 leading-relaxed">
                Theme selections automatically trigger <code>setTheme</code> actions via Redux Toolkit slices and persist immediately to <code>localStorage</code> (key: <code>stacklenzz_theme</code>). Upon page reloads or navigating between administrative views, the theme is instantly restored without visual flickering.
              </p>
            </div>
          </section>

          {/* Section: CLI Commands */}
          <section id="cli-commands" className="mb-14">
            <h2 className="text-2xl font-bold m-0 mb-4">💻 Stacklenzz CLI Reference</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h4 className="m-0 mb-1.5 text-sky-400 text-[15px]">1. dashboard</h4>
                <p className="m-0 mb-3 text-[13px] text-slate-400">
                  Auto-detects framework and generates an admin dashboard route.
                </p>
                <code className="block p-2 bg-slate-950 rounded-md text-indigo-300 text-[12px] break-all">
                  stacklenzz dashboard
                </code>
                <span className="text-[11.5px] text-slate-500 mt-1.5 block">
                  Or with npx: <code>npx stacklenzz dashboard</code>
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h4 className="m-0 mb-1.5 text-emerald-400 text-[15px]">2. doctor</h4>
                <p className="m-0 mb-3 text-[13px] text-slate-400">
                  Validates dependencies and tests live telemetry reachability.
                </p>
                <code className="block p-2 bg-slate-950 rounded-md text-indigo-300 text-[12px] break-all">
                  stacklenzz doctor
                </code>
                <span className="text-[11.5px] text-slate-500 mt-1.5 block">
                  Or with npx: <code>npx stacklenzz doctor</code>
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h4 className="m-0 mb-1.5 text-amber-400 text-[15px]">3. init</h4>
                <p className="m-0 mb-3 text-[13px] text-slate-400">
                  Creates an interactive <code>observability.config.ts</code> configuration.
                </p>
                <code className="block p-2 bg-slate-950 rounded-md text-indigo-300 text-[12px] break-all">
                  stacklenzz init
                </code>
                <span className="text-[11.5px] text-slate-500 mt-1.5 block">
                  Or with npx: <code>npx stacklenzz init</code>
                </span>
              </div>
            </div>
          </section>

          {/* Section: Express */}
          <section id="express" className="mb-14">
            <h2 className="text-2xl font-bold m-0 mb-3">Express Instrumentation</h2>
            <p className="text-slate-400 m-0 mb-4 text-[14px]">
              Call <code>setupObservability(app)</code> before declaring your routes:
            </p>
            <pre className="m-0 p-4 bg-slate-950 border border-white/10 rounded-xl text-slate-50 font-mono text-[13px] leading-relaxed overflow-x-auto">
{`import express from "express";
import { setupObservability, addBreadcrumb } from "@stacklenzz/server";

const app = express();

// Enables /metrics, Winston JSON logging & /api/observability/stats
setupObservability(app, {
  serviceName: "billing-service",
  environment: "production",
});

app.get("/api/checkout", (req, res) => {
  addBreadcrumb({ category: "cart", message: "Processing card payment", level: "info" });
  res.json({ status: "success" });
});

// Fallback for non-existent routes (captured as 404 in dashboard)
app.use((req, res) => {
  res.status(404).json({ statusCode: 404, error: "Not Found", message: \`Cannot \${req.method} \${req.url}\` });
});

app.listen(5000, () => console.log("Server listening on port 5000"));`}
            </pre>
          </section>

          {/* Section: NestJS */}
          <section id="nestjs" className="mb-14">
            <h2 className="text-2xl font-bold m-0 mb-3">NestJS Module Setup</h2>
            <p className="text-slate-400 m-0 mb-4 text-[14px]">
              Import <code>ObservabilityModule.forRoot()</code> in your root <code>AppModule</code>:
            </p>
            <pre className="m-0 p-4 bg-slate-950 border border-white/10 rounded-xl text-slate-50 font-mono text-[13px] leading-relaxed overflow-x-auto">
{`import { Module } from "@nestjs/common";
import { ObservabilityModule } from "@stacklenzz/server/nestjs";

@Module({
  imports: [
    ObservabilityModule.forRoot({
      serviceName: "auth-service",
      environment: process.env.NODE_ENV || "production",
    }),
  ],
})
export class AppModule {}`}
            </pre>
          </section>

          {/* Section: Advanced SDK Features */}
          <section id="sdk-advanced" className="mb-14">
            <h2 className="text-2xl font-bold m-0 mb-3">⚡️ Advanced SDK Features & Telemetry APIs</h2>
            <p className="text-slate-400 m-0 mb-4 text-[14px]">
              Unlock powerful built-in telemetry utilities directly from <code>@stacklenzz/server</code>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4.5">
                <div className="text-sm font-bold text-sky-400 mb-1.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  1. Automatic Error Fingerprinting & Deduplication
                </div>
                <p className="text-xs text-slate-300 m-0 leading-relaxed">
                  Error messages are dynamically sanitized (stripping IDs, timestamps, and numbers) to compute a deterministic hash. 50 recurring database failures appear as <strong>1 grouped incident card</strong> with occurrence counters (<code>x50</code>) and occurrence timestamps.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4.5">
                <div className="text-sm font-bold text-indigo-400 mb-1.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  2. Programmatic Snapshot API (<code>getObservabilitySnapshot</code>)
                </div>
                <p className="text-xs text-slate-300 m-0 leading-relaxed">
                  Generate instant JSON operational snapshots directly inside your Node.js code to stream live metrics via WebSockets or push custom alerts to Slack/Discord.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4.5">
                <div className="text-sm font-bold text-emerald-400 mb-1.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  3. Custom Prometheus Metrics (<code>Counter</code>, <code>Gauge</code>, <code>register</code>)
                </div>
                <p className="text-xs text-slate-300 m-0 leading-relaxed">
                  Re-exports <code>prom-client</code> primitives directly. Register custom domain metrics (e.g. <code>orders_created_total</code>) without installing extra dependencies.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4.5">
                <div className="text-sm font-bold text-amber-400 mb-1.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  4. OpenTelemetry Native Exports (<code>trace</code>, <code>context</code>)
                </div>
                <p className="text-xs text-slate-300 m-0 leading-relaxed">
                  Direct access to OpenTelemetry API primitives to create custom spans and extract active trace IDs without installing <code>@opentelemetry/api</code> separately.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">
                Example: Programmatic Snapshot &amp; Custom Prometheus Metric
              </div>
              <pre className="m-0 text-slate-200 font-mono text-xs leading-relaxed overflow-x-auto">
{`import { getObservabilitySnapshot, Counter, register } from "@stacklenzz/server";

// 1. Register custom business metric on the /metrics endpoint
const ordersCounter = new Counter({
  name: "orders_processed_total",
  help: "Total processed checkout orders",
  registers: [register],
});
ordersCounter.inc();

// 2. Fetch live telemetry JSON directly in backend code
const snapshot = await getObservabilitySnapshot();
console.log("Current Error Rate:", snapshot.summary.errorRate);
console.log("Active Requests:", snapshot.summary.activeRequests);`}
              </pre>
            </div>
          </section>

          {/* Section: Metrics & OpenTelemetry */}
          <section id="metrics-tracing" className="mb-14">
            <h2 className="text-2xl font-bold m-0 mb-3">📊 Metrics & OpenTelemetry Distributed Tracing</h2>
            <p className="text-slate-400 m-0 mb-4 text-[14px]">
              <code>@stacklenzz/server</code> provides built-in Prometheus metric collection via <code>prom-client</code> on <code>/metrics</code> and OpenTelemetry NodeSDK tracing:
            </p>
            <div className="bg-slate-950 border border-white/10 rounded-xl p-4 mb-4">
              <div className="text-xs font-bold text-sky-400 uppercase mb-2">
                Prometheus Endpoints &amp; Automatic Metrics
              </div>
              <ul className="m-0 pl-5 text-slate-300 text-xs flex flex-col gap-1.5 leading-relaxed">
                <li><code>http_requests_total</code>: Counter tracking total HTTP requests broken down by method, route, and status code.</li>
                <li><code>http_request_duration_seconds</code>: Histogram tracking P50, P95, and P99 latency percentiles across endpoints.</li>
                <li><code>http_active_requests</code>: Gauge monitoring active in-flight requests.</li>
                <li>Standard Node.js runtime metrics: CPU usage %, RSS/Heap memory, and V8 event loop lag.</li>
              </ul>
            </div>
            <pre className="m-0 p-4 bg-slate-950 border border-white/10 rounded-xl text-slate-50 font-mono text-[13px] leading-relaxed overflow-x-auto">
{`import { initTracing, logger } from "@stacklenzz/server";

// Tracing auto-initializes by default, injecting trace_id and span_id into Winston logs
logger.info("Processing order checkout", { orderId: "ORD-9912" });
// Output: {"level":"info","message":"Processing order checkout","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","span_id":"00f067aa0ba902b7"}`}
            </pre>
          </section>

          {/* Section: Error Intelligence & Breadcrumbs */}
          <section id="error-intel" className="mb-14">
            <h2 className="text-2xl font-bold m-0 mb-3">🐞 Error Intelligence & Event Breadcrumbs</h2>
            <p className="text-slate-400 m-0 mb-4 text-[14px]">
              Trace user interactions and operations prior to a failure using event breadcrumbs:
            </p>
            <pre className="m-0 p-4 bg-slate-950 border border-white/10 rounded-xl text-slate-50 font-mono text-[13px] leading-relaxed overflow-x-auto mb-4">
{`import { addBreadcrumb, logger } from "@stacklenzz/server";

// 1. Record event trail before operations
addBreadcrumb({ category: "auth", message: "User session validated: usr_9921", level: "info" });
addBreadcrumb({ category: "db", message: "SELECT * FROM orders WHERE id = 'ORD-9912'", level: "info" });

// 2. Log error when failure occurs
try {
  throw new Error("DatabaseConnectionTimeout: Pool limit reached");
} catch (err) {
  // Breadcrumbs recorded above are automatically attached to this error card!
  logger.error(err);
}`}
            </pre>
          </section>

          {/* Section: Auth & Middleware Security */}
          <section id="security" className="mb-14">
            <h2 className="text-2xl font-bold m-0 mb-3">🔒 Production Auth & Middleware Security</h2>
            <p className="text-slate-400 m-0 mb-4 text-[14px]">
              Because the dashboard displays live backend request timings and error logs, ensure the <code>/admin/observability</code> route is protected behind your application authentication layer:
            </p>
            <pre className="m-0 p-4 bg-slate-950 border border-white/10 rounded-xl text-slate-50 font-mono text-[13px] leading-relaxed overflow-x-auto">
{`// middleware.ts (Next.js App Router)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin/observability")) {
    const adminToken = req.cookies.get("admin_session");
    if (!adminToken) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
  return NextResponse.next();
}`}
            </pre>
          </section>

          {/* Section: Hosting Live on Vercel / Cloud */}
          <section id="deployment" className="mb-14">
            <h2 className="text-2xl font-bold m-0 mb-3">🚀 Hosting Live on Vercel / Cloud</h2>
            <p className="text-slate-400 m-0 mb-4 text-[14px]">
              Deploying your frontend dashboard and backend services to production:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4.5">
                <div className="text-sm font-bold text-sky-400 mb-1.5">
                  Frontend (Vercel / Netlify / Render)
                </div>
                <p className="text-xs text-slate-300 m-0 leading-relaxed">
                  Set the environment variable <code>NEXT_PUBLIC_OBSERVABILITY_URL</code> to point to your live backend endpoint (e.g. <code>https://api.yourdomain.com/api/observability/stats</code>).
                </p>
              </div>

              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4.5">
                <div className="text-sm font-bold text-indigo-400 mb-1.5">
                  Backend (AWS / GCP / Docker / Railway)
                </div>
                <p className="text-xs text-slate-300 m-0 leading-relaxed">
                  Ensure CORS headers permit requests from your admin dashboard origin in <code>setupObservability</code> or NestJS <code>app.enableCors()</code>.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Search Dialog Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsSearchOpen(false)}
            className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-start justify-center pt-[12vh] px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[580px] bg-slate-900 border border-white/10 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7),0_0_35px_rgba(99,102,241,0.15)] overflow-hidden flex flex-col"
            >
              {/* Search Input Bar */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 bg-white/5">
                <Search size={18} className="text-indigo-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search documentation, topics, SDK setup..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-slate-50 text-[15px]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="bg-transparent border-none text-slate-500 cursor-pointer p-1 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                )}
                <div className="text-[11px] px-2 py-1 bg-white/5 rounded border border-white/10 text-slate-400 font-medium">
                  ESC
                </div>
              </div>

              {/* Search Results List */}
              <div className="max-h-[380px] overflow-y-auto p-2 flex flex-col gap-1">
                {(() => {
                  const query = searchQuery.trim().toLowerCase();
                  const allItems = navItems.flatMap((g) =>
                    g.items.map((it) => ({ ...it, groupName: g.group }))
                  );
                  const filtered = query
                    ? allItems.filter(
                        (item) =>
                          item.label.toLowerCase().includes(query) ||
                          item.groupName.toLowerCase().includes(query) ||
                          item.id.toLowerCase().includes(query)
                      )
                    : allItems;

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 px-4 text-center text-slate-500 text-[13.5px]">
                        No documentation matching &ldquo;<span className="text-slate-100">{searchQuery}</span>&rdquo;
                      </div>
                    );
                  }

                  return filtered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery("");
                        handleNavClick(item.id);
                      }}
                      className="group flex items-center justify-between px-3.5 py-2.5 rounded-lg border-none bg-transparent text-slate-200 cursor-pointer text-left transition-colors hover:bg-indigo-500/15"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                          {item.icon}
                        </div>
                        <div>
                          <div className="text-[13.5px] font-medium text-slate-50">
                            {item.label}
                          </div>
                          <div className="text-[11.5px] text-slate-500">
                            {item.groupName}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Jump</span>
                        <CornerDownLeft size={13} />
                      </div>
                    </button>
                  ));
                })()}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 text-[11px] text-slate-500 bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5 mr-1 text-slate-400">↵</kbd> to select</span>
                  <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5 mr-1 text-slate-400">ESC</kbd> to close</span>
                </div>
                <span className="text-indigo-400 font-medium">Observability Docs</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
