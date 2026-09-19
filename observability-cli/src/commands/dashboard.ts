import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import prompts from "prompts";
import { detectProject, PackageManager } from "../utils/detect.js";

export interface DashboardCommandOptions {
  route?: string;
  template?: string;
  packageManager?: string;
  dryRun?: boolean;
  yes?: boolean;
}

export async function runDashboardCommand(options: DashboardCommandOptions) {
  const cwd = process.cwd();
  console.log(pc.bold(pc.cyan("\n🚀 Stacklenzz CLI - Dashboard Installer\n")));

  const onCancel = () => {
    console.log(pc.red("\n✖ Operation cancelled by user"));
    process.exit(1);
  };

  const ctx = detectProject(cwd, options.packageManager);

  // Framework status
  if (ctx.framework === "next-app") {
    console.log(`${pc.green("✓")} Next.js App Router detected`);
  } else if (ctx.framework === "next-pages") {
    console.log(`${pc.green("✓")} Next.js Pages Router detected`);
  } else if (ctx.framework === "react-vite") {
    console.log(`${pc.green("✓")} React + Vite detected`);
  } else {
    console.log(`${pc.yellow("!")} Standard React/Web project detected`);
  }

  console.log(`${pc.green("✓")} Language: ${ctx.isTypeScript ? "TypeScript" : "JavaScript"}`);
  console.log(`${pc.green("✓")} Package Manager: ${pc.bold(ctx.packageManager)}`);

  // Prompt route
  let targetRoute = options.route || "/admin/observability";
  if (!options.yes && !options.route) {
    const routePrompt = await prompts({
      type: "select",
      name: "route",
      message: "Where should the dashboard be installed?",
      choices: [
        { title: "/admin/observability (Recommended - private admin area)", value: "/admin/observability" },
        { title: "/observability", value: "/observability" },
        { title: "Custom route", value: "custom" },
      ],
      initial: 0,
    }, { onCancel });

    if (routePrompt.route === "custom") {
      const customPrompt = await prompts({
        type: "text",
        name: "customRoute",
        message: "Enter custom route path (e.g. /dashboard/metrics):",
        initial: "/dashboard/observability",
      }, { onCancel });
      targetRoute = customPrompt.customRoute;
    } else if (routePrompt.route) {
      targetRoute = routePrompt.route;
    }
  }

  // Prompt template
  let template = options.template || "ObservabilityDashboard";
  if (!options.yes && !options.template) {
    const templatePrompt = await prompts({
      type: "select",
      name: "template",
      message: "Choose default dashboard template:",
      choices: [
        { title: "Universal Console (Recommended - Includes interactive switcher & 6 runtime themes)", value: "ObservabilityDashboard" },
        { title: "Full Backend Suite (All-in-one health, requests, errors, CPU, latency)", value: "FullBackendDashboard" },
        { title: "Database Crash Logs (Dedicated database error logs viewer)", value: "CrashLogsDashboard" },
        { title: "API Overview (Routes, request rates, HTTP status breakdown)", value: "ApiOverviewDashboard" },
        { title: "Performance (Latency percentiles P50, P95, P99, slow requests)", value: "BackendPerformanceDashboard" },
        { title: "Error Monitoring (Spikes, 4xx/5xx breakdown, failure logs)", value: "ErrorMonitoringDashboard" },
        { title: "Node.js Runtime (CPU, RSS memory, heap, event loop lag)", value: "NodeRuntimeDashboard" },
        { title: "Minimal Widget (Compact summary for existing admin sidebars)", value: "MinimalDashboard" },
      ],
      initial: 0,
    }, { onCancel });
    if (templatePrompt.template) {
      template = templatePrompt.template;
    }
  }

  // Determine file destination
  const routeNormalized = targetRoute.replace(/^\//, "").replace(/\/$/, "");
  let destFile = "";

  if (ctx.framework === "next-app") {
    const isSrc = fs.existsSync(path.join(cwd, "src", "app"));
    const baseAppDir = isSrc ? path.join(cwd, "src", "app") : path.join(cwd, "app");
    const routeDir = path.join(baseAppDir, ...routeNormalized.split("/"));
    destFile = path.join(routeDir, ctx.isTypeScript ? "page.tsx" : "page.jsx");
  } else if (ctx.framework === "next-pages") {
    const isSrc = fs.existsSync(path.join(cwd, "src", "pages"));
    const basePagesDir = isSrc ? path.join(cwd, "src", "pages") : path.join(cwd, "pages");
    const routeDir = path.join(basePagesDir, ...routeNormalized.split("/"));
    destFile = path.join(routeDir, ctx.isTypeScript ? "index.tsx" : "index.jsx");
  } else {
    // React / Vite
    const srcDir = fs.existsSync(path.join(cwd, "src")) ? path.join(cwd, "src") : cwd;
    destFile = path.join(srcDir, ctx.isTypeScript ? "ObservabilityDashboard.tsx" : "ObservabilityDashboard.jsx");
  }

  const pageContent = generateDashboardPageCode(template, targetRoute, ctx.framework);

  console.log(`\n${pc.cyan("Target file:")} ${destFile}`);

  if (options.dryRun) {
    console.log(pc.yellow("\n[Dry Run Mode] Would write the following content:"));
    console.log(pc.dim("--------------------------------------------------"));
    console.log(pageContent);
    console.log(pc.dim("--------------------------------------------------"));
    console.log(pc.green("\n✓ Dry run completed successfully. No files modified.\n"));
    return;
  }

  // Write file
  const destDir = path.dirname(destFile);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  if (fs.existsSync(destFile)) {
    if (!options.yes) {
      const overwritePrompt = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `File already exists at ${destFile}. Overwrite?`,
        initial: false,
      }, { onCancel });
      if (!overwritePrompt.overwrite) {
        console.log(pc.yellow("Aborted without overwriting."));
        return;
      }
    }
  }

  fs.writeFileSync(destFile, pageContent, "utf-8");
  console.log(`${pc.green("✓")} Dashboard page generated at ${pc.bold(destFile)}`);

  // Write sample observability.config.ts if absent
  const configPath = path.join(cwd, ctx.isTypeScript ? "observability.config.ts" : "observability.config.js");
  if (!fs.existsSync(configPath)) {
    const configContent = `export default {
  // Point to your Express or NestJS backend
  endpoint: process.env.NEXT_PUBLIC_OBSERVABILITY_URL || "http://localhost:5000/api/observability/stats",
  refreshIntervalMs: 5000,
  mockMode: false,
};
`;
    fs.writeFileSync(configPath, configContent, "utf-8");
    console.log(`${pc.green("✓")} Created ${pc.bold(path.basename(configPath))}`);
  }

  // Install dependencies option
  let packagesInstalled = false;
  if (!options.dryRun) {
    let shouldInstall = options.yes;
    if (!options.yes) {
      const installPrompt = await prompts({
        type: "confirm",
        name: "install",
        message: "Would you like to install the required UI packages now? (@stacklenzz/ui, lucide-react)",
        initial: true,
      }, { onCancel });
      shouldInstall = installPrompt.install;
    }

    if (shouldInstall) {
      console.log(`\n📦 Installing dependencies using ${pc.bold(ctx.packageManager)}...`);
      try {
        const { execSync } = await import("node:child_process");
        const installCmd = `${ctx.packageManager} ${ctx.packageManager === "npm" ? "install" : "add"} @stacklenzz/ui lucide-react`;
        execSync(installCmd, { stdio: "inherit", cwd });
        console.log(`${pc.green("✓")} Dependencies installed successfully!`);
        packagesInstalled = true;
      } catch (err) {
        console.log(`${pc.red("✗")} Failed to install dependencies. You may need to run it manually.`);
      }
    }
  }

  // Next steps summary
  console.log(pc.bold(pc.green("\n🎉 Stacklenzz Dashboard successfully installed!\n")));
  console.log(pc.bold("Next steps:"));
  let stepNum = 1;
  if (!packagesInstalled) {
    console.log(` ${stepNum++}. Install UI packages:`);
    console.log(`    ${pc.cyan(`${ctx.packageManager} ${ctx.packageManager === "npm" ? "install" : "add"} @stacklenzz/ui lucide-react`)}`);
  }
  console.log(` ${stepNum++}. Start your backend and frontend apps.`);
  console.log(` ${stepNum++}. Navigate to:`);
  console.log(`    ${pc.cyan(`http://localhost:3000${targetRoute}`)}\n`);
  console.log(pc.dim(`🔒 Security Tip: Place ${targetRoute} behind your app's existing admin middleware or route guards.\n`));
}

function generateDashboardPageCode(template: string, route: string, framework: string): string {
  const isAppRouter = framework === "next-app";

  return `// Generated by @stacklenzz/cli
// Route: ${route}
${isAppRouter ? '"use client";\n' : ""}
import { ${template} } from "@stacklenzz/ui";

/**
 * Backend Observability Dashboard
 *
 * IMPORTANT SECURITY NOTE:
 * This dashboard visualizes backend operations, response latencies, and runtime stats.
 * Ensure this route is protected behind your application's admin authorization or middleware!
 */
export default function ObservabilityDashboardPage() {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#090d16" }}>
      <${template}
        config={{
          endpoint: process.env.NEXT_PUBLIC_OBSERVABILITY_URL || "http://localhost:5000/api/observability/stats",
          refreshIntervalMs: 5000,
        }}${template === "ObservabilityDashboard" ? `\n        defaultDashboard="full"\n        showSwitcher={true}` : ""}
      />
    </main>
  );
}
`;
}
