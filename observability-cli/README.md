<p align="center">
  <img src="./assets/logo.svg" alt="Stacklenzz Logo" width="80" height="80" />
</p>

<h1 align="center">@stacklenzz/cli</h1>

<p align="center">
  A zero-configuration command-line interface to inspect, install, and scaffold <b>Stacklenzz</b> backend observability dashboards into React, Next.js (App Router & Pages Router), and Vite applications.
</p>

<p align="center">
  <a href="https://stacklenzz.vercel.app/"><b>📖 Full Documentation & Interactive Portal: https://stacklenzz.vercel.app/</b></a>
</p>

---

## Features

- **Automatic Environment Detection**:
  - Automatically identifies active package managers (`pnpm`, `npm`, `yarn`, `bun`).
  - Detects frontend framework (`Next.js App Router`, `Next.js Pages Router`, `Vite/React`).
  - Identifies TypeScript vs JavaScript.
- **Doctor Diagnostic**: Checks Node version, package health, and live reachability of your backend telemetry endpoint.
- **Non-Destructive Scaffolding**: Automatically creates admin observability routes with security warnings without overwriting your existing code.
- **Dry-Run Mode**: Inspect generated files before any changes are written to disk.

---

## Installation

You can run the CLI on-demand via package runners (no permanent installation required):

```bash
# Using npx (scoped package or alias)
npx @stacklenzz/cli [command]

# Or with short command runner
npx stacklenzz [command]
```

Or install globally:
```bash
npm install -g @stacklenzz/cli
```
Once installed globally, you can invoke all commands directly using **`stacklenzz`**:
```bash
stacklenzz doctor
stacklenzz dashboard
stacklenzz init
```

---

## Commands & Usage

### Supported Binaries & Aliases
When installed globally or via package managers, the CLI is available under three equivalent commands:
- `stacklenzz`
- `stackcli`
- `stack`

---

### 1. `stacklenzz doctor` (or `npx stacklenzz doctor`)
Diagnoses your environment, checks for installed dependencies, and verifies that your backend telemetry endpoint (`/api/observability/stats`) is online:

```bash
stacklenzz doctor
```

**Options:**
- `-e, --endpoint <url>`: Test a custom backend telemetry URL (e.g., `-e http://localhost:5000/api/observability/stats`).

**Example Output:**
```
🩺 Stacklenzz CLI - System & Health Doctor

✓ Node.js runtime: v24.10.0 (compatible >= 18)
✓ Package manager: npm
✓ Frontend framework: next-app (TypeScript)
✓ Stacklenzz UI: Installed
✓ Telemetry endpoint reachable! HTTP 200 (45ms)
   Backend service: my-backend-api [production]
   Requests recorded: 14,291

Doctor check finished.
```

---

### 2. `stacklenzz dashboard`
Scaffolds a production-ready observability dashboard page into your React or Next.js app:

```bash
npx stacklenzz dashboard
```

**Interactive Templates Available:**
1. `ObservabilityDashboard`: Universal console featuring interactive template switcher and 6 runtime themes *(Recommended)*
2. `FullBackendDashboard`: Complete health suite with metric cards, HTTP status breakdown, latency gauge, runtime metrics, and live error inspector
3. `ApiOverviewDashboard`: Request rates, status distribution, and top endpoints breakdown
4. `BackendPerformanceDashboard`: P50, P95, and P99 latency percentiles and slowest routes
5. `ErrorMonitoringDashboard`: Error spike tracking, 4xx/5xx streams, occurrence counters, and breadcrumbs
6. `NodeRuntimeDashboard`: Process CPU %, RSS memory, heap allocations, and event loop lag
7. `MinimalDashboard`: Compact status summary tile for embedding in existing admin sidebars

**Options:**
- `-r, --route <route>`: Destination route path (default: `/admin/observability`).
- `-t, --template <template>`: Template to generate (`ObservabilityDashboard`, `FullBackendDashboard`, etc.).
- `-p, --package-manager <pm>`: Force a package manager (`npm`, `pnpm`, `yarn`, `bun`).
- `--dry-run`: Preview file generation in the terminal without modifying any files.
- `-y, --yes`: Skip interactive prompts and accept smart defaults.

**Examples:**
```bash
# Preview what would be created without disk writes:
npx stacklenzz dashboard --dry-run -y

# Generate a custom route in Next.js:
npx stacklenzz dashboard --route /admin/system-health -y

# Scaffold with specific package manager:
npx stacklenzz dashboard --package-manager pnpm
```

---

### 3. `stacklenzz init`
Creates a standardized, strongly-typed `observability.config.ts` configuration file in your project root:

```bash
npx stacklenzz init
```

---

## 🤝 Contributing & Documentation

Contributions are welcome! Please visit the official **[Stacklenzz Documentation Portal](https://stacklenzz.vercel.app/)** for full CLI command guides, framework setup tutorials, and troubleshooting tips.

To report bugs or contribute code:
1. Open an issue or Pull Request on GitHub.
2. Ensure unit tests pass (`npm run test:cli`).

---

## License
Apache License 2.0 © Goodnews Azonubi
