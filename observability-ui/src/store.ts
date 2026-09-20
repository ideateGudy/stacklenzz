import { RuntimeTheme, RUNTIME_THEMES } from "./themes.js";

export const LOCAL_STORAGE_THEME_KEY = "stacklenzz_theme";

export interface ObservabilityState {
  theme: RuntimeTheme;
}

/**
 * Safely retrieve initial theme from localStorage if in browser environment.
 */
export function getSavedTheme(fallback: RuntimeTheme = "tokyo-night"): RuntimeTheme {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }
  try {
    const saved = window.localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    if (saved && saved in RUNTIME_THEMES) {
      return saved as RuntimeTheme;
    }
  } catch {
    // Ignore localStorage access errors (e.g. sandboxed iframes)
  }
  return fallback;
}

/**
 * Safely save theme to localStorage if in browser environment.
 */
export function persistTheme(theme: RuntimeTheme): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
  } catch {
    // Ignore localStorage write errors
  }
}

export const themeSlice = {
  name: "observability",
  reducer: observabilityReducer,
  actions: {
    setTheme,
  },
};

export const SET_THEME = "observability/setTheme";

export function setTheme(theme: RuntimeTheme) {
  return {
    type: SET_THEME,
    payload: theme,
  };
}

export const setThemeAction = setTheme;

export interface Action<T = any> {
  type: string;
  payload?: T;
}

export interface ObservabilityStore {
  getState: () => { observability: ObservabilityState };
  dispatch: (action: Action) => Action;
  subscribe: (listener: () => void) => () => void;
}

export function observabilityReducer(
  state: ObservabilityState = { theme: getSavedTheme("tokyo-night") },
  action: Action
): ObservabilityState {
  if (action && (action.type === SET_THEME || action.type === "observability/setTheme")) {
    if (action.payload in RUNTIME_THEMES) {
      persistTheme(action.payload);
      return { ...state, theme: action.payload };
    }
  }
  return state;
}

/**
 * Create a lightweight native store matching the store interface for backward compatibility
 */
export function createObservabilityStore(initialTheme?: RuntimeTheme): ObservabilityStore {
  const resolvedInitialTheme =
    initialTheme && initialTheme in RUNTIME_THEMES
      ? initialTheme
      : getSavedTheme("tokyo-night");

  let currentState: ObservabilityState = {
    theme: resolvedInitialTheme,
  };

  const listeners = new Set<() => void>();

  return {
    getState: () => ({
      observability: currentState,
    }),
    dispatch: (action: Action) => {
      currentState = observabilityReducer(currentState, action);
      listeners.forEach((listener) => listener());
      return action;
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type RootState = ReturnType<ObservabilityStore["getState"]>;
export type AppDispatch = ObservabilityStore["dispatch"];

let defaultStore: ObservabilityStore | null = null;

export function getDefaultObservabilityStore(initialTheme?: RuntimeTheme): ObservabilityStore {
  if (!defaultStore) {
    defaultStore = createObservabilityStore(initialTheme);
  }
  return defaultStore;
}
