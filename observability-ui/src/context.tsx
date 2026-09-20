import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { ObservabilitySnapshot, ObservabilityConfig } from "./types.js";
import { generateMockSnapshot } from "./mock.js";
import { RuntimeTheme, ThemeColors, RUNTIME_THEMES } from "./themes.js";
import {
  ObservabilityStore,
  createObservabilityStore,
  getSavedTheme,
  persistTheme,
} from "./store.js";

export interface ObservabilityContextValue {
  snapshot: ObservabilitySnapshot | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  isMock: boolean;
  theme: RuntimeTheme;
  setTheme: (theme: RuntimeTheme) => void;
  themeColors: ThemeColors;
  store: ObservabilityStore;
  dbCrashLogs: import("./types.js").CapturedErrorRecord[];
  deleteCrashLog: (id: string) => Promise<boolean>;
  clearAllCrashLogs: () => Promise<boolean>;
}

const ObservabilityContext = createContext<ObservabilityContextValue | null>(null);

export interface ObservabilityProviderProps {
  children: React.ReactNode;
  config?: ObservabilityConfig;
  initialSnapshot?: ObservabilitySnapshot;
}

export function ObservabilityProvider({
  children,
  config = {},
  initialSnapshot,
}: ObservabilityProviderProps) {
  const existingContext = useContext(ObservabilityContext);
  if (existingContext) {
    return <>{children}</>;
  }

  const [snapshot, setSnapshot] = useState<ObservabilitySnapshot | null>(
    initialSnapshot || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(!initialSnapshot);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialSnapshot ? new Date() : null
  );

  const initialConfigTheme: RuntimeTheme =
    config.theme && config.theme in RUNTIME_THEMES
      ? (config.theme as RuntimeTheme)
      : getSavedTheme("tokyo-night");

  const [theme, setThemeState] = useState<RuntimeTheme>(initialConfigTheme);

  // Maintain lightweight store for backward compatibility
  const [store] = useState<ObservabilityStore>(() =>
    createObservabilityStore(initialConfigTheme)
  );

  const endpoint = config.endpoint || "/api/observability/stats";
  const refreshIntervalMs = config.refreshIntervalMs ?? 5000;
  const isMock = config.mockMode ?? false;

  const fetchTelemetry = useCallback(async () => {
    if (isMock) {
      setSnapshot(generateMockSnapshot());
      setLastUpdated(new Date());
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (config.token) {
        headers["Authorization"] = `Bearer ${config.token}`;
      }

      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        throw new Error(`Failed to fetch backend telemetry: HTTP ${res.status}`);
      }

      const data: ObservabilitySnapshot = await res.json();
      setSnapshot(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, isMock, config.token]);

  useEffect(() => {
    fetchTelemetry();

    if (refreshIntervalMs > 0) {
      const interval = setInterval(fetchTelemetry, refreshIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchTelemetry, refreshIntervalMs]);

  useEffect(() => {
    if (config.theme && config.theme in RUNTIME_THEMES && config.theme !== theme) {
      setThemeState(config.theme as RuntimeTheme);
      persistTheme(config.theme as RuntimeTheme);
    }
  }, [config.theme, theme]);

  const handleSetTheme = useCallback(
    (newTheme: RuntimeTheme) => {
      if (newTheme in RUNTIME_THEMES) {
        setThemeState(newTheme);
        persistTheme(newTheme);
        store.dispatch({ type: "observability/setTheme", payload: newTheme });
      }
    },
    [store]
  );

  const themeColors = useMemo(
    () => RUNTIME_THEMES[theme] || RUNTIME_THEMES["tokyo-night"],
    [theme]
  );

  const deleteCrashLog = useCallback(
    async (id: string): Promise<boolean> => {
      // Optimistically update snapshot in local state
      setSnapshot((prev) => {
        if (!prev) return null;
        const currentList =
          prev.dbCrashLogs ||
          (prev.recentErrors || []).filter(
            (e) => !e.statusCode || e.statusCode >= 500
          );
        const updated = currentList.filter((l) => l.id !== id);
        return {
          ...prev,
          dbCrashLogs: updated,
        };
      });

      if (isMock) {
        return true;
      }

      try {
        const baseUrl = endpoint.replace(/\/stats\/?$/, "");
        const deleteUrl = `${baseUrl}/crash-logs/${encodeURIComponent(id)}`;
        const headers: Record<string, string> = { Accept: "application/json" };
        if (config.token) headers["Authorization"] = `Bearer ${config.token}`;
        const res = await fetch(deleteUrl, { method: "DELETE", headers });
        return res.ok;
      } catch {
        return false;
      }
    },
    [endpoint, isMock, config.token]
  );

  const clearAllCrashLogs = useCallback(async (): Promise<boolean> => {
    // Optimistically clear in local state
    setSnapshot((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        dbCrashLogs: [],
      };
    });

    if (isMock) {
      return true;
    }

    try {
      const baseUrl = endpoint.replace(/\/stats\/?$/, "");
      const clearUrl = `${baseUrl}/crash-logs`;
      const headers: Record<string, string> = { Accept: "application/json" };
      if (config.token) headers["Authorization"] = `Bearer ${config.token}`;
      const res = await fetch(clearUrl, { method: "DELETE", headers });
      return res.ok;
    } catch {
      return false;
    }
  }, [endpoint, isMock, config.token]);

  const dbCrashLogs =
    snapshot?.dbCrashLogs ||
    (snapshot?.recentErrors || []).filter(
      (e) => !e.statusCode || e.statusCode >= 500
    );

  const value = useMemo<ObservabilityContextValue>(
    () => ({
      snapshot,
      isLoading,
      error,
      lastUpdated,
      refresh: fetchTelemetry,
      isMock,
      theme,
      setTheme: handleSetTheme,
      themeColors,
      store,
      dbCrashLogs,
      deleteCrashLog,
      clearAllCrashLogs,
    }),
    [
      snapshot,
      isLoading,
      error,
      lastUpdated,
      fetchTelemetry,
      isMock,
      theme,
      handleSetTheme,
      themeColors,
      store,
      dbCrashLogs,
      deleteCrashLog,
      clearAllCrashLogs,
    ]
  );

  return (
    <ObservabilityContext.Provider value={value}>
      {children}
    </ObservabilityContext.Provider>
  );
}

export function useObservability(): ObservabilityContextValue {
  const context = useContext(ObservabilityContext);
  if (!context) {
    throw new Error(
      "useObservability must be used within an <ObservabilityProvider>"
    );
  }
  return context;
}
