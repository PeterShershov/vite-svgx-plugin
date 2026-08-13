import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parse } from "./parse.ts";
import { generateComponent } from "./generate.ts";
import type { Plugin } from "vite";

export interface SvgxOptions {
  /** SVGO config object, or `false` to disable. Requires `svgo` to be installed. */
  svgo?: Record<string, unknown> | false;
  /** Wrap generated components with React.forwardRef, forwarding ref to the root svg element. */
  forwardRef?: boolean;
  /** Wrap generated components in React.memo. */
  memo?: boolean;
  /**
   * Keep `width` and `height` attributes from the root SVG tag.
   * Set to `false` to strip them (e.g. when sizing via CSS). Defaults to `true`.
   */
  dimensions?: boolean;
}

const DEFAULT_SVGO_PLUGINS = ["preset-default", "prefixIds"];

/** Try to load svgo's optimize function. Returns undefined if not installed. */
function loadSvgo():
  | ((svg: string, config?: object) => { data: string })
  | undefined {
  try {
    const require = createRequire(import.meta.url);
    return require("svgo").optimize;
  } catch {
    return undefined;
  }
}

/** Parse module ID into filepath, returns null if not a ?react SVG request */
function parseSvgRequest(id: string): string | null {
  const queryIdx = id.lastIndexOf("?");
  if (queryIdx === -1) return null;

  const filepath = id.slice(0, queryIdx);
  const search = new URLSearchParams(id.slice(queryIdx + 1));

  if (!search.has("react") || !filepath.endsWith(".svg")) return null;
  return filepath;
}

export default function svgx(options?: SvgxOptions): Plugin {
  const svgoConfig = options?.svgo;
  const optimize = svgoConfig !== false ? loadSvgo() : undefined;
  const useForwardRef = options?.forwardRef ?? false;
  const useMemo = options?.memo ?? false;
  const dimensions = options?.dimensions ?? true;

  return {
    name: "vite-svgx-plugin",
    enforce: "pre",

    async resolveId(source, importer) {
      const filepath = parseSvgRequest(source);
      if (!filepath) return;

      const resolved = await this.resolve(filepath, importer, {
        skipSelf: true,
      });
      if (resolved) return resolved.id + "?react";
    },

    load(id) {
      const filepath = parseSvgRequest(id);
      if (!filepath) return;

      let svg = readFileSync(filepath, "utf-8");

      if (optimize) {
        const userConfig = typeof svgoConfig === "object" ? svgoConfig : {};
        svg = optimize(svg, {
          plugins: DEFAULT_SVGO_PLUGINS,
          ...userConfig,
          path: filepath,
        }).data;
      }

      const tree = parse(svg);
      const code = generateComponent(tree, filepath, {
        forwardRef: useForwardRef,
        memo: useMemo,
        dimensions,
      });
      return { code, map: null };
    },
  };
}
