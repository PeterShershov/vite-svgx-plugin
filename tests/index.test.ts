import { describe, it } from "node:test";
import {
  strictEqual,
  notStrictEqual,
  ok,
  match,
  doesNotMatch,
  doesNotThrow,
} from "node:assert";
import svgx from "../src/index.ts";
import { loadSvg, loadRaw, asFunctionBody } from "./helpers.ts";

describe("vite-svgx-plugin", () => {
  describe("plugin metadata", () => {
    it("has the correct name", () => {
      const plugin = svgx();
      strictEqual(plugin.name, "vite-svgx-plugin");
    });

    it("enforces pre", () => {
      const plugin = svgx();
      strictEqual(plugin.enforce, "pre");
    });
  });

  describe("load hook — filtering", () => {
    it("returns undefined for non-svg files", () => {
      const plugin = svgx();
      const result = (plugin.load as Function).call({}, "/foo/bar.ts");
      strictEqual(result, undefined);
    });

    it("returns undefined for svg without ?react query", () => {
      const plugin = svgx();
      const result = (plugin.load as Function).call({}, "/foo/bar.svg");
      strictEqual(result, undefined);
    });

    it("returns undefined for non-jsx query", () => {
      const plugin = svgx();
      const result = (plugin.load as Function).call({}, "/foo/bar.svg?url");
      strictEqual(result, undefined);
    });

    it("returns code for svg with ?react query", () => {
      ok(typeof loadRaw("./tests/fixtures/typescript.svg") === "string");
    });
  });

  describe("end-to-end smoke", () => {
    const fixtures = [
      "./tests/fixtures/typescript.svg",
      "./tests/fixtures/vite.svg",
      "./tests/fixtures/icons.svg",
    ];

    for (const file of fixtures) {
      it(`produces syntactically valid JS for ${file.split("/").pop()}`, () => {
        doesNotThrow(() => new Function(asFunctionBody(loadRaw(file))));
      });
    }
  });

  describe("svgo integration", () => {
    it("changes output vs svgo: false", () => {
      const withSvgo = loadSvg("./tests/fixtures/typescript.svg");
      const withoutSvgo = loadRaw("./tests/fixtures/typescript.svg");
      notStrictEqual(withSvgo, withoutSvgo);
    });

    it("prefixes IDs by default", () => {
      const code = loadSvg("./tests/fixtures/vite.svg");
      match(code, /vite_svg__/);
    });

    it("svgo: false preserves style element and unprefixed IDs", () => {
      const code = loadRaw("./tests/fixtures/vite.svg");
      ok(code.includes('h("style"'));
      ok(code.includes(".parenthesis"));
    });

    it("accepts custom svgo config", () => {
      const code = loadSvg("./tests/fixtures/vite.svg", {
        svgo: { plugins: ["preset-default"] },
      });
      doesNotMatch(code, /vite_svg__/);
    });

    it("produces valid JS with svgo enabled", () => {
      const files = [
        "./tests/fixtures/typescript.svg",
        "./tests/fixtures/vite.svg",
        "./tests/fixtures/icons.svg",
      ];
      for (const file of files) {
        doesNotThrow(() => new Function(asFunctionBody(loadSvg(file))));
      }
    });
  });
});
