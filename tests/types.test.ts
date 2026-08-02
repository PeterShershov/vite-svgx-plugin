/**
 * Typecheck `tests/types/consumer.tsx` against React 19's types.
 *
 * The single most reported class of upstream issues is TypeScript not seeing
 * the SVG module (pd4d10/vite-plugin-svgr#150, #128, #118, #111, #57, #51, #44),
 * so the ambient declaration gets its own compile.
 */
import { describe, it } from "node:test";
import { strictEqual } from "node:assert";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("ambient *.svg?react types", () => {
  it("compiles a React 19 consumer with no extra setup", () => {
    const { status, stdout, stderr } = spawnSync(
      process.execPath,
      [
        resolve(root, "node_modules/typescript/bin/tsc"),
        "-p",
        resolve(root, "tests/types/tsconfig.json"),
      ],
      { encoding: "utf-8" },
    );

    strictEqual(status, 0, `tsc reported errors:\n${stdout}${stderr}`);
  });
});
