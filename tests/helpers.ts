import { resolve } from "node:path";
import svgx from "../src/index.ts";
import type { SvgxOptions } from "../src/index.ts";

/** Call the plugin's load hook directly. Paths are relative to the repo root. */
export function loadSvg(filepath: string, options?: SvgxOptions): string {
  const plugin = svgx(options);
  const abs = resolve(filepath);
  const result = (plugin.load as Function).call({}, abs + "?react");
  return result.code;
}

/** Load without SVGO — exercises the parser/generator directly */
export function loadRaw(filepath: string): string {
  return loadSvg(filepath, { svgo: false });
}

/** Strip import/export so the module body can be evaluated as plain JS */
export function asFunctionBody(code: string): string {
  return code.replace(/^import .+$/gm, "").replace(/^export default /gm, "void ");
}
