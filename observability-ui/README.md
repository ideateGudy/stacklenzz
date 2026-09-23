<p align="center">
  <img src="./assets/logo.svg" alt="Stacklenzz Logo" width="80" height="80" />
</p>

<h1 align="center">@stacklenzz/ui</h1>

<p align="center">
  A stunning, developer-first React & Next.js dashboard UI ecosystem for backend observability, monitoring, and error tracking.
</p>

<p align="center">
  <a href="https://stacklenzz.vercel.app/"><b>📖 Full Documentation & Interactive Portal: https://stacklenzz.vercel.app/</b></a>
</p>

Built with Vanilla CSS & zero heavy UI framework lock-in, featuring glassmorphism, curated dark mode aesthetics, native React Context state management, and micro-interactions.

---

## Features

- **Native React Context Architecture**:
  - Powered by native React Context (`useState`, `useEffect`, `useCallback`, `useMemo`).
  - Automatic `localStorage` persistence under key `stacklenzz_theme` — theme selection persists seamlessly across reloads and navigation.
  - Dynamic full-page theme color propagation affecting card backgrounds, text typography, borders, badges, and charts.
- **7 Pre-Composed Dashboard Templates**:
  - `<ObservabilityDashboard />`: All-in-one suite with a built-in interactive template switcher and theme dropdown picker.
  - `<FullBackendDashboard />`: Complete view with overview cards, HTTP breakdown charts, latency gauge, runtime health, and live error inspector.
  - `<ApiOverviewDashboard />`: High-level traffic, status codes, top endpoints overview.
  - `<BackendPerformanceDashboard />`: Latencies (P50, P95, P99), response time breakdown, and endpoint timings.
  - `<ErrorMonitoringDashboard />`: Live error tracker, 4xx/5xx streams, occurrences counter, and breadcrumbs.
  - `<CrashLogsDashboard />`: Dedicated database 5xx crash log console with search, stack traces, breadcrumbs, context, individual delete, and clear-all controls.
  - `<NodeRuntimeDashboard />`: Node.js process health (CPU, RSS, Heap memory, Event loop lag).
  - `<MinimalDashboard />`: Compact status widget suitable for embedding in existing admin sidebars or headers.
- **6 Built-in Runtime Themes**:
  - Tokyo Night (`tokyo-night`), Nord (`nord`), Dracula (`dracula`), Catppuccin Mocha (`catppuccin`), Emerald Terminal (`emerald-terminal`), Cyberpunk (`cyberpunk`).
- **Deep Error Inspector**:
  - Detailed modal inspector with stack traces, context tags (OS, Node version, memory, IP, user-agent), and request payload responses.
  - Dynamic occurrence recalculation based on sliding time windows (`x4` ➔ `x2`).
  - Breadcrumbs timeline with newest-first / oldest-first sorting toggles.
- **Dynamic Composite Health Evaluation**:
  - Service header dynamically evaluates `HEALTHY` / `DEGRADED` / `CRITICAL` state based on active runtime metrics and the user's selected Error Rate time window (`1m`, `5m`, `15m`, `1h`, `All-time`).
  - Industry SLA thresholds: `CRITICAL` at $\ge 5\%$ Error Rate (5xx server errors), $\ge 2000\text{ms}$ P95 Latency, $\ge 90\%$ CPU, $\ge 100\text{ms}$ Event Loop Lag, or $\ge 95\%$ Heap (when Heap $> 128\text{MB}$); `DEGRADED` at $\ge 1\%$ Error Rate, $\ge 800\text{ms}$ P95 Latency, $\ge 75\%$ CPU, $\ge 30\text{ms}$ Event Loop Lag, or $\ge 85\%$ Heap (when Heap $> 128\text{MB}$).
  - 5xx Server Error Rate formula: $\text{Error Rate} = \left(\frac{\text{HTTP 500+ Responses}}{\text{Total Responses}}\right) \times 100$.
  - Excludes legacy database crash logs (`dbCrashLogs`) from health calculations so old instances do not falsely trigger active degradation.
- **Customizable Rolling Windows**: Interactive selector for error rates and counts across `1m`, `5m`, `15m`, `30m`, `1h`, `2h`, `24h`, `7d`, and `30d`.

---

## Installation

```bash
npm install @stacklenzz/ui lucide-react
# or
pnpm add @stacklenzz/ui lucide-react
```

### Peer Dependencies:
- `react`: `>=18.0.0`
- `react-dom`: `>=18.0.0`
- `lucide-react`: `>=0.263.0`

---

## Usage

### 1. Unified Dashboard with Template & Theme Switcher (Recommended)

```tsx
"use client";

import { ObservabilityDashboard } from "@stacklenzz/ui";

export default function AdminObservabilityPage() {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "transparent" }}>
      <ObservabilityDashboard
        config={{
          endpoint: process.env.NEXT_PUBLIC_OBSERVABILITY_URL || "http://localhost:5000/api/observability/stats",
          refreshIntervalMs: 5000,
        }}
        defaultDashboard="full"
        showSwitcher={true}
      />
    </main>
  );
}
```

### 2. Standalone Dashboard Templates

You can import any individual template directly without the top switcher:

```tsx
import {
  FullBackendDashboard,
  ApiOverviewDashboard,
  BackendPerformanceDashboard,
  ErrorMonitoringDashboard,
  NodeRuntimeDashboard,
  MinimalDashboard,
} from "@stacklenzz/ui";

// Example: Embedding just Error Monitoring
<ErrorMonitoringDashboard config={{ endpoint: "http://localhost:5000/api/observability/stats" }} />
```

### 3. Custom Composability with Low-Level Components & React Context

You can build your own custom dashboard layout using atomic components and access the underlying theme & snapshot state via `useObservability()`:

```tsx
import {
  ObservabilityProvider,
  useObservability,
  MetricGrid,
  MetricCard,
  HttpStatusChart,
  LatencyGauge,
  EndpointTable,
  RuntimeMetrics,
  ErrorInspector,
} from "@stacklenzz/ui";

function MyCustomView() {
  const { snapshot, theme, themeColors, setTheme } = useObservability();
  if (!snapshot) return null;

  return (
    <div style={{ background: themeColors.background, color: themeColors.text }}>
      <button onClick={() => setTheme("emerald-terminal")}>Switch to Emerald Theme</button>
      <HttpStatusChart breakdown={snapshot.http.statusBreakdown} />
      <ErrorInspector errors={snapshot.recentErrors} globalBreadcrumbs={snapshot.breadcrumbs} />
    </div>
  );
}

export function CustomDashboard() {
  return (
    <ObservabilityProvider config={{ endpoint: "http://localhost:5000/api/observability/stats" }}>
      <MyCustomView />
    </ObservabilityProvider>
  );
}
```

---

## Next.js & Framework Integration

`@stacklenzz/ui` is **100% standalone and self-styled** with zero Tailwind CSS or external component library requirements. All glassmorphism styles, glowing gradients, theme variables, and keyframe animations are encapsulated in pure Vanilla inline styles.

When importing `@stacklenzz/ui` in Next.js (App Router or Pages Router), add it to `transpilePackages` in `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@stacklenzz/ui"],
};

export default nextConfig;
```

---

## 🤝 Contributing & Documentation

Contributions are welcome! Please visit the official **[Stacklenzz Documentation Portal](https://stacklenzz.vercel.app/)** to explore setup guides, interactive UI demos, and usage examples.

To report bugs or contribute code:
1. Open an issue or Pull Request on GitHub.
2. Ensure unit tests pass (`npm run test:ui`).

---

## License
Apache License 2.0 © Goodnews Azonubi
