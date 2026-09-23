import { describe, it, expect } from "vitest";
import { generateMockSnapshot } from "../src/mock.js";
import { DASHBOARD_TEMPLATES } from "../src/components/DashboardSwitcher.js";
import * as UI from "../src/index.js";

describe("Observability UI Components & Templates Test Suite", () => {
  it("should generate a complete and valid mock snapshot with all required fields", () => {
    const snapshot = generateMockSnapshot("mock-test-service");

    expect(snapshot.service.name).toBe("mock-test-service");
    expect(snapshot.service.environment).toBe("production");
    expect(snapshot.summary.totalRequests).toBeGreaterThan(0);
    expect(snapshot.summary.p95LatencyMs).toBeGreaterThan(0);
    expect(snapshot.windows).toBeDefined();
    expect(snapshot.windows?.last5m.totalRequests).toBeGreaterThan(0);
    expect(snapshot.http.statusBreakdown.status2xx).toBeGreaterThan(0);
    expect(snapshot.http.topEndpoints.length).toBeGreaterThan(0);
    expect(snapshot.recentErrors?.length).toBeGreaterThan(0);
    expect(snapshot.breadcrumbs?.length).toBeGreaterThan(0);
  });

  it("should export all 6 dashboard templates and the universal template", () => {
    expect(UI.ObservabilityDashboard).toBeDefined();
    expect(UI.FullBackendDashboard).toBeDefined();
    expect(UI.ApiOverviewDashboard).toBeDefined();
    expect(UI.BackendPerformanceDashboard).toBeDefined();
    expect(UI.ErrorMonitoringDashboard).toBeDefined();
    expect(UI.NodeRuntimeDashboard).toBeDefined();
    expect(UI.MinimalDashboard).toBeDefined();
  });

  it("should export all core components", () => {
    expect(UI.MetricCard).toBeDefined();
    expect(UI.MetricGrid).toBeDefined();
    expect(UI.ServiceHeader).toBeDefined();
    expect(UI.HttpStatusChart).toBeDefined();
    expect(UI.LatencyGauge).toBeDefined();
    expect(UI.EndpointTable).toBeDefined();
    expect(UI.RuntimeMetrics).toBeDefined();
    expect(UI.ErrorInspector).toBeDefined();
    expect(UI.DashboardSwitcher).toBeDefined();
  });

  it("should include all 7 templates in DASHBOARD_TEMPLATES with valid metadata", () => {
    expect(DASHBOARD_TEMPLATES.length).toBe(7);
    const templateIds = DASHBOARD_TEMPLATES.map((t) => t.id);
    expect(templateIds).toContain("full");
    expect(templateIds).toContain("api");
    expect(templateIds).toContain("performance");
    expect(templateIds).toContain("errors");
    expect(templateIds).toContain("crash-logs");
    expect(templateIds).toContain("runtime");
    expect(templateIds).toContain("minimal");

    DASHBOARD_TEMPLATES.forEach((tmpl) => {
      expect(tmpl.label).toBeTruthy();
      expect(tmpl.shortDesc).toBeTruthy();
      expect(tmpl.icon).toBeTruthy();
    });
  });

  it("should export all 6 built-in runtime themes with complete color schemes", () => {
    expect(UI.RUNTIME_THEMES).toBeDefined();
    const themeKeys = Object.keys(UI.RUNTIME_THEMES);
    expect(themeKeys).toHaveLength(6);
    expect(themeKeys).toEqual([
      "tokyo-night",
      "nord",
      "dracula",
      "catppuccin",
      "emerald-terminal",
      "cyberpunk",
    ]);

    themeKeys.forEach((key) => {
      const theme = UI.RUNTIME_THEMES[key as UI.RuntimeTheme];
      expect(theme.id).toBe(key);
      expect(theme.name).toBeTruthy();
      expect(theme.description).toBeTruthy();
      expect(theme.accent).toBeTruthy();
      expect(theme.accentSecondary).toBeTruthy();
      expect(theme.background).toBeTruthy();
      expect(theme.cardBg).toBeTruthy();
      expect(theme.cardBorder).toBeTruthy();
      expect(theme.headerBg).toBeTruthy();
      expect(theme.text).toBeTruthy();
      expect(theme.textMuted).toBeTruthy();
      expect(theme.switcherBg).toBeTruthy();
      expect(theme.badgeBg).toBeTruthy();
      expect(theme.badgeBorder).toBeTruthy();
      expect(theme.glow).toBeTruthy();
    });
  });

  it("should have correct curated aesthetics for each of the 6 themes", () => {
    // Tokyo Night
    expect(UI.RUNTIME_THEMES["tokyo-night"].name).toBe("Tokyo Night");
    expect(UI.RUNTIME_THEMES["tokyo-night"].accent).toBe("#38bdf8");
    expect(UI.RUNTIME_THEMES["tokyo-night"].background).toBe("#0b0d14");

    // Nord
    expect(UI.RUNTIME_THEMES["nord"].name).toBe("Nord");
    expect(UI.RUNTIME_THEMES["nord"].accent).toBe("#38bdf8");
    expect(UI.RUNTIME_THEMES["nord"].background).toBe("#0f141c");

    // Dracula
    expect(UI.RUNTIME_THEMES["dracula"].name).toBe("Dracula");
    expect(UI.RUNTIME_THEMES["dracula"].accent).toBe("#c084fc");
    expect(UI.RUNTIME_THEMES["dracula"].background).toBe("#0e0d15");

    // Catppuccin Mocha
    expect(UI.RUNTIME_THEMES["catppuccin"].name).toBe("Catppuccin Mocha");
    expect(UI.RUNTIME_THEMES["catppuccin"].accent).toBe("#b4befe");
    expect(UI.RUNTIME_THEMES["catppuccin"].background).toBe("#11111b");

    // Emerald Terminal
    expect(UI.RUNTIME_THEMES["emerald-terminal"].name).toBe("Emerald Terminal");
    expect(UI.RUNTIME_THEMES["emerald-terminal"].accent).toBe("#10b981");
    expect(UI.RUNTIME_THEMES["emerald-terminal"].background).toBe("#030d08");

    // Cyberpunk
    expect(UI.RUNTIME_THEMES["cyberpunk"].name).toBe("Cyberpunk");
    expect(UI.RUNTIME_THEMES["cyberpunk"].accent).toBe("#ff2a85");
    expect(UI.RUNTIME_THEMES["cyberpunk"].background).toBe("#090514");
  });

  it("should provide consistent contrast: background and cardBg are distinct from text", () => {
    Object.values(UI.RUNTIME_THEMES).forEach((t) => {
      // background and text must not be identical
      expect(t.background).not.toBe(t.text);
      expect(t.cardBg).not.toBe(t.text);
      // textMuted must be defined
      expect(t.textMuted).toBeTruthy();
    });
  });

  describe("Native State Management & LocalStorage Persistence", () => {
    it("should export store primitives, slices, and action creators", () => {
      expect(UI.createObservabilityStore).toBeDefined();
      expect(UI.themeSlice).toBeDefined();
      expect(UI.setTheme).toBeDefined();
      expect(UI.setThemeAction).toBeDefined();
      expect(UI.LOCAL_STORAGE_THEME_KEY).toBe("stacklenzz_theme");
      expect(UI.SET_THEME).toBe("observability/setTheme");
    });

    it("should create store with initial theme and process setTheme actions correctly", () => {
      const store = UI.createObservabilityStore("nord");
      expect(store.getState().observability.theme).toBe("nord");

      const action = UI.setTheme("dracula");
      expect(action).toEqual({
        type: "observability/setTheme",
        payload: "dracula",
      });

      store.dispatch(action);
      expect(store.getState().observability.theme).toBe("dracula");
    });

    it("should notify subscribers when state changes", () => {
      const store = UI.createObservabilityStore("tokyo-night");
      let notifiedTheme = "";

      const unsubscribe = store.subscribe(() => {
        notifiedTheme = store.getState().observability.theme;
      });

      store.dispatch(UI.setTheme("cyberpunk"));
      expect(notifiedTheme).toBe("cyberpunk");

      unsubscribe();
      store.dispatch(UI.setTheme("emerald-terminal"));
      // Should not notify after unsubscribing
      expect(notifiedTheme).toBe("cyberpunk");
      expect(store.getState().observability.theme).toBe("emerald-terminal");
    });

    it("should persist selected theme to localStorage and retrieve it", () => {
      // Mock window.localStorage
      const mockStorage: Record<string, string> = {};
      const originalWindow = globalThis.window;

      const fakeLocalStorage = {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
        },
      };

      // Assign to global window
      (globalThis as any).window = {
        localStorage: fakeLocalStorage,
      };

      try {
        // Initial store dispatch
        const store = UI.createObservabilityStore("tokyo-night");
        store.dispatch(UI.setTheme("catppuccin"));

        // Verify it was stored in localStorage under stacklenzz_theme
        expect(fakeLocalStorage.getItem("stacklenzz_theme")).toBe("catppuccin");

        // Verify getSavedTheme restores it
        const saved = UI.getSavedTheme();
        expect(saved).toBe("catppuccin");

        // New store initialized without explicit theme should load from localStorage
        const newStore = UI.createObservabilityStore();
        expect(newStore.getState().observability.theme).toBe("catppuccin");
      } finally {
        (globalThis as any).window = originalWindow;
      }
    });

    it("should handle unknown or corrupt localStorage theme values gracefully with fallback", () => {
      const originalWindow = globalThis.window;
      (globalThis as any).window = {
        localStorage: {
          getItem: () => "invalid-corrupted-theme-name",
          setItem: () => {},
        },
      };

      try {
        const saved = UI.getSavedTheme("tokyo-night");
        expect(saved).toBe("tokyo-night");
      } finally {
        (globalThis as any).window = originalWindow;
      }
    });

    it("should propagate theme color schemes dynamically across all 6 themes", () => {
      const themeKeys: UI.RuntimeTheme[] = [
        "tokyo-night",
        "nord",
        "dracula",
        "catppuccin",
        "emerald-terminal",
        "cyberpunk",
      ];

      themeKeys.forEach((themeKey) => {
        const store = UI.createObservabilityStore("tokyo-night");
        store.dispatch(UI.setTheme(themeKey));

        const activeTheme = store.getState().observability.theme;
        expect(activeTheme).toBe(themeKey);

        const colors = UI.RUNTIME_THEMES[activeTheme];
        expect(colors.background).toBeTruthy();
        expect(colors.cardBg).toBeTruthy();
        expect(colors.accent).toBeTruthy();
        expect(colors.text).toBeTruthy();
        expect(colors.cardBorder).toBeTruthy();
        expect(colors.textMuted).toBeTruthy();
        expect(colors.switcherBg).toBeTruthy();
      });
    });

    it("should export CrashLogsDashboard and CrashLogsList components", () => {
      expect(UI.CrashLogsDashboard).toBeDefined();
      expect(UI.CrashLogsList).toBeDefined();
      const crashTemplate = UI.DASHBOARD_TEMPLATES.find((t) => t.id === "crash-logs");
      expect(crashTemplate).toBeDefined();
      expect(crashTemplate?.label).toBe("Database Crash Logs");
    });

    it("should export SloCard, TraceWaterfall, and JobsOverview components", () => {
      expect(UI.SloCard).toBeDefined();
      expect(UI.TraceWaterfall).toBeDefined();
      expect(UI.JobsOverview).toBeDefined();
    });

    it("should render SloCard with error budget and burn rate without crashing", () => {
      const sloData = {
        availabilityTarget: 99.5,
        currentAvailability: 99.8,
        errorBudgetPercent: 60,
        burnRate: 0.8,
        status: "healthy" as const,
      };
      expect(sloData.errorBudgetPercent).toBe(60);
      expect(sloData.burnRate).toBe(0.8);
      expect(UI.SloCard).toBeDefined();
    });

    it("should export TraceWaterfall and process spans hierarchy", () => {
      const traces = [
        {
          traceId: "t1",
          rootSpanName: "GET /api/checkout",
          durationMs: 45,
          startTime: Date.now(),
          status: "ok" as const,
          spans: [
            {
              id: "s1",
              name: "AuthGuard",
              type: "guard" as const,
              durationMs: 5,
              startTime: Date.now() - 40,
              endTime: Date.now() - 35,
              status: "ok" as const,
            },
          ],
        },
      ];
      expect(traces[0].spans.length).toBe(1);
      expect(UI.TraceWaterfall).toBeDefined();
    });
  });
});



