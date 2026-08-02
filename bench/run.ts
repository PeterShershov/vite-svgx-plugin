import { writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

// ── Plugins ──────────────────────────────────────────────────────────

import svgx from "../src/index.ts";
import svgr from "vite-plugin-svgr";

// ── Config ───────────────────────────────────────────────────────────

// V8 needs far more than a handful of calls to reach steady state, and the
// first plugin measured otherwise eats the tiering cost for everyone.
const WARMUP = 200;
const ITERATIONS = 1000;
const SVG_DIR = resolve(import.meta.dirname, "fixtures");

// ── Helpers ──────────────────────────────────────────────────────────

function collectSvgs(dir: string): { name: string; absPath: string }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".svg"))
    .sort()
    .map((f) => ({ name: f, absPath: resolve(dir, f) }));
}

function stats(times: number[]) {
  if (times.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, p95: 0 };
  }
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    mean: +(sum / sorted.length).toFixed(3),
    median: +median.toFixed(3),
    min: +sorted[0].toFixed(3),
    max: +sorted[sorted.length - 1].toFixed(3),
    p95: +sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(3),
  };
}

type Stats = ReturnType<typeof stats>;

interface PluginEntry {
  name: string;
  load: (id: string) => unknown | Promise<unknown>;
  query: string;
}

function buildPlugins(): PluginEntry[] {
  const svgxWithSvgo = svgx();
  const svgxNoSvgo = svgx({ svgo: false });
  // vite-plugin-svgr checks this.meta.rolldownVersion to choose its JSX transform.
  // With rolldownVersion set it uses transformWithOxc (Rolldown/Vite 6+ path).
  // The classic transformWithEsbuild path is deprecated and requires a separate
  // esbuild install, so the Rolldown path is the only working option here.
  const svgrCtx = { meta: { rolldownVersion: "1.0.0" } };
  // svgr never runs SVGO on its own: vite-plugin-svgr calls @svgr/core with
  // `caller: { defaultPlugins: [jsx] }` and @svgr/core's own DEFAULT_PLUGINS is
  // empty, so `svgr()` is the jsx-only row below. To compare SVGO against SVGO
  // we have to add @svgr/plugin-svgo by hand and hand it the same plugin list
  // svgx defaults to (DEFAULT_SVGO_PLUGINS in src/index.ts) — otherwise the two
  // SVGO rows would be running different amounts of work.
  //
  // @svgr/plugin-svgo depends on svgo ^3, so without the `overrides` entry in
  // package.json it would bring its own svgo 3.x while svgx uses the project's
  // svgo 4.x — same settings, different engine. The override pins both to one
  // copy so the two SVGO rows really are the same optimizer.
  const SVGO_CONFIG = { plugins: ["preset-default", "prefixIds"] };
  const svgrJsx = svgr({ svgrOptions: { plugins: ["@svgr/plugin-jsx"] } });
  const svgrWithSvgo = svgr({
    svgrOptions: {
      plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
      svgoConfig: SVGO_CONFIG,
    },
  });

  return [
    {
      name: "svgx (svgo)",
      load: (id: string) => (svgxWithSvgo.load as Function).call({}, id),
      query: "?react",
    },
    {
      name: "svgx (no svgo)",
      load: (id: string) => (svgxNoSvgo.load as Function).call({}, id),
      query: "?react",
    },
    {
      name: "svgr (jsx only)",
      load: (id: string) => (svgrJsx.load as Function).call(svgrCtx, id, {}),
      query: "?react",
    },
    {
      name: "svgr (svgo)",
      load: (id: string) => (svgrWithSvgo.load as Function).call(svgrCtx, id, {}),
      query: "?react",
    },
  ];
}

/**
 * Guard against a fixture that SVGO optimizes into nothing. An unreferenced
 * <defs>/<symbol> sprite gets stripped down to a bare <svg/>, and the row then
 * times converting an empty file — which is how "adding SVGO made svgr faster"
 * once ended up in the results.
 */
function assertMeaningfulOutput(
  pluginName: string,
  file: string,
  result: unknown,
): void {
  const code =
    result && typeof result === "object" && "code" in result
      ? (result as { code: string }).code
      : undefined;
  if (code === undefined) {
    throw new Error(`${pluginName} produced no output for ${file} — it never ran.`);
  }
  const elements = (code.match(/_jsx\(|h\(/g) ?? []).length;
  if (elements < 2) {
    throw new Error(
      `${pluginName} emitted a near-empty component for ${file} ` +
        `(${elements} element(s), ${code.length} bytes). The fixture is probably ` +
        `being optimized away — timing it measures nothing.`,
    );
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const svgs = collectSvgs(SVG_DIR);
  if (svgs.length === 0) {
    console.error("No SVG fixtures found in", SVG_DIR);
    process.exit(1);
  }

  const plugins = buildPlugins();

  if (!globalThis.gc) {
    console.warn(
      "warning: running without --expose-gc; use `npm run bench` for GC control\n",
    );
  }

  console.log(
    `Benchmarking ${plugins.length} plugins × ${svgs.length} SVGs × ${ITERATIONS} iterations (${WARMUP} warmup, interleaved)\n`,
  );

  const results: Record<string, Record<string, Stats>> = {};
  for (const plugin of plugins) results[plugin.name] = {};

  for (const svg of svgs) {
    console.log(`  ${svg.name}`);

    // Warm every plugin on this file before timing any of them, so no plugin
    // pays another's JIT cost.
    for (const plugin of plugins) {
      for (let w = 0; w < WARMUP; w++) {
        const out = await plugin.load(svg.absPath + plugin.query);
        if (w === 0) assertMeaningfulOutput(plugin.name, svg.name, out);
      }
    }

    globalThis.gc?.();

    // Interleave: rotate which plugin goes first each iteration so drift,
    // thermal state and GC pauses land on all of them equally.
    const ids = plugins.map((p) => svg.absPath + p.query);
    const times: number[][] = plugins.map(() => []);
    for (let n = 0; n < ITERATIONS; n++) {
      for (let k = 0; k < plugins.length; k++) {
        const idx = (k + n) % plugins.length;
        const t0 = performance.now();
        await plugins[idx].load(ids[idx]);
        times[idx].push(performance.now() - t0);
      }
    }

    plugins.forEach((plugin, i) => {
      const s = stats(times[i]);
      results[plugin.name][svg.name] = s;
      console.log(
        `    ${plugin.name.padEnd(18)} mean=${String(s.mean).padEnd(8)}ms  median=${String(s.median).padEnd(8)}ms  p95=${String(s.p95).padEnd(8)}ms`,
      );
    });
  }

  // Summary: mean across all files for each plugin
  const summary: Record<
    string,
    { meanOfMeans: number; meanOfMedians: number }
  > = {};
  for (const [pluginName, fileStats] of Object.entries(results)) {
    const means = Object.values(fileStats).map((s) => s.mean);
    const medians = Object.values(fileStats).map((s) => s.median);
    summary[pluginName] = {
      meanOfMeans: +(means.reduce((a, b) => a + b, 0) / means.length).toFixed(
        3,
      ),
      meanOfMedians: +(
        medians.reduce((a, b) => a + b, 0) / medians.length
      ).toFixed(3),
    };
  }

  // Speedups, computed here so the README never has to divide by hand.
  const PAIRS = [
    { label: "no svgo", fast: "svgx (no svgo)", slow: "svgr (jsx only)" },
    { label: "svgo", fast: "svgx (svgo)", slow: "svgr (svgo)" },
  ];
  const speedup: Record<string, Record<string, number>> = {};
  for (const pair of PAIRS) {
    speedup[pair.label] = {};
    for (const svg of svgs) {
      const fast = results[pair.fast][svg.name].median;
      const slow = results[pair.slow][svg.name].median;
      speedup[pair.label][svg.name] = +(slow / fast).toFixed(1);
    }
  }

  console.log("\n  speedup (median svgr ÷ median svgx)");
  for (const pair of PAIRS) {
    for (const svg of svgs) {
      console.log(
        `    ${pair.label.padEnd(8)} ${svg.name.padEnd(20)} ${speedup[pair.label][svg.name]}×`,
      );
    }
  }

  const output = {
    meta: {
      date: new Date().toISOString(),
      node: process.version,
      warmup: WARMUP,
      iterations: ITERATIONS,
      order: "interleaved",
      files: svgs.map((s) => ({ name: s.name, path: s.absPath })),
    },
    results,
    summary,
    speedup,
  };

  const outPath = resolve(import.meta.dirname, "results.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nResults written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
