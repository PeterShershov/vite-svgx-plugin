/**
 * Regression tests for scenarios reported as open issues against
 * `vite-plugin-svgr` (https://github.com/pd4d10/vite-plugin-svgr/issues).
 * Each test names the upstream issue it pins down.
 *
 * Baseline plugin behaviour (svgo on/off, valid output, id prefixing) lives in
 * `index.test.ts`; this file only covers what those tests do not already reach.
 */
import { describe, it } from "node:test";
import { strictEqual, notStrictEqual, ok, match, doesNotMatch, doesNotThrow } from "node:assert";
import { readFileSync } from "node:fs";
import svgx from "../src/index.ts";
import { parse } from "../src/parse.ts";
import { generateComponent } from "../src/generate.ts";
import { loadSvg, loadRaw, asFunctionBody } from "./helpers.ts";

describe("upstream vite-plugin-svgr issues", () => {
  describe("#141 — no JSX in the emitted module", () => {
    // svgr emits JSX and depends on a separate oxc/esbuild pass, which breaks
    // when the JSX runtime options are missing. We emit createElement calls, so
    // the module body parses as plain JS — JSX would be a syntax error here.
    it("emits createElement calls, not JSX", () => {
      const code = loadRaw("./tests/fixtures/css-braces.svg");
      match(code, /createElement as h/);
      doesNotThrow(() => new Function(asFunctionBody(code)));
    });

    it("emits no JSX with svgo enabled either", () => {
      const code = loadSvg("./tests/fixtures/css-braces.svg");
      match(code, /createElement as h/);
      doesNotThrow(() => new Function(asFunctionBody(code)));
    });
  });

  describe("#49 — <style> containing CSS braces", () => {
    // Braces inside <style> made svgr's JSX output unparseable
    // ('Expected "}" but found ":"'). Text nodes are string literals for us.
    it("keeps the CSS rules verbatim", () => {
      const code = loadRaw("./tests/fixtures/css-braces.svg");
      match(code, /\.cls-1 \{/);
      match(code, /fill: currentColor;/);
    });
  });

  describe("#134 — CDATA inside <style>", () => {
    it("keeps the CSS instead of dropping the style content", () => {
      const code = loadRaw("./tests/fixtures/cdata-style.svg");
      match(code, /@media \(prefers-color-scheme: dark\)/);
      match(code, /fill: currentColor;/);
      doesNotMatch(code, /h\("style", null\)/);
    });

    it("does not leak the CDATA markers into the CSS", () => {
      const code = loadRaw("./tests/fixtures/cdata-style.svg");
      doesNotMatch(code, /CDATA/);
      doesNotMatch(code, /\]\]>/);
    });
  });

  describe("#135 — namespaced tags and attributes", () => {
    // svgr throws "Namespace tags are not supported by default" with no way to
    // pass `throwIfNamespace` through. We pass them through instead.
    it("does not throw on namespace tags", () => {
      doesNotThrow(() => loadRaw("./tests/fixtures/namespaced.svg"));
    });

    it("keeps the namespaced element", () => {
      const code = loadRaw("./tests/fixtures/namespaced.svg");
      match(code, /h\("sodipodi:namedview"/);
    });

    it("camelCases namespaced attributes React knows", () => {
      const code = loadRaw("./tests/fixtures/namespaced.svg");
      match(code, /"xlinkHref": "#a"/);
    });

    it("keeps the qualified name for prefixes React does not know", () => {
      // Camel-casing these reaches the DOM as `inkscapezoom`, silently dropping
      // the namespace instead of passing the attribute through.
      const code = loadRaw("./tests/fixtures/namespaced.svg");
      match(code, /"inkscape:zoom": "16"/);
      doesNotMatch(code, /inkscapeZoom/);
    });

    it("drops every xmlns prefix binding, not just xmlns:xlink", () => {
      const code = loadRaw("./tests/fixtures/namespaced.svg");
      doesNotMatch(code, /xmlns/i);
    });

    it("drops xmlns bindings on nested elements too, not just the root", () => {
      // Nested <svg>/<foreignObject> roots re-declare their editor's prefixes,
      // so stripping only the outer <svg> leaves the rest behind.
      const code = loadRaw("./tests/fixtures/nested-namespaced.svg");
      doesNotMatch(code, /xmlns/i);
    });

    it("does not invent a React name for an unknown xmlns prefix", () => {
      // A surviving binding would also be camelCased, and `xmlnsInkscape` is not
      // in React's possibleStandardNames — it reaches the DOM lowercased as
      // `xmlnsinkscape`, losing the namespace and the readable name with it.
      const code = loadRaw("./tests/fixtures/nested-namespaced.svg");
      doesNotMatch(code, /xmlnsInkscape/);
    });
  });

  describe("#125, #133 — stripping width/height", () => {
    // `removeDimensions` / `icon` never worked through svgr's option chain.
    it("keeps width and height by default", () => {
      const code = loadSvg("./tests/fixtures/sized-icon.svg");
      match(code, /"width": "20"/);
      match(code, /"height": "20"/);
    });

    it("strips width and height but keeps viewBox with dimensions: false", () => {
      const code = loadSvg("./tests/fixtures/sized-icon.svg", { dimensions: false });
      doesNotMatch(code, /"width": "20"/);
      doesNotMatch(code, /"height": "20"/);
      match(code, /"viewBox": "0 0 20 20"/);
    });

    it("can also strip them through a user svgo config", () => {
      const code = loadSvg("./tests/fixtures/sized-icon.svg", {
        svgo: { plugins: [{ name: "preset-default" }, "removeDimensions"] },
      });
      doesNotMatch(code, /"width": "20"/);
      match(code, /"viewBox": "0 0 20 20"/);
    });

    it("can drop <desc> and other junk through svgo", () => {
      const kept = loadSvg("./tests/fixtures/sized-icon.svg");
      match(kept, /a described icon/); // preset-default keeps authored <desc>

      const stripped = loadSvg("./tests/fixtures/sized-icon.svg", {
        svgo: {
          plugins: [
            { name: "preset-default" },
            { name: "removeDesc", params: { removeAny: true } },
          ],
        },
      });
      doesNotMatch(stripped, /a described icon/);
    });
  });

  describe("#98 — id collisions between SVGs", () => {
    it("prefixes ids per file so two SVGs cannot collide", () => {
      const a = loadSvg("./tests/fixtures/ids-a.svg");
      const b = loadSvg("./tests/fixtures/ids-b.svg");
      const idOf = (code: string) => code.match(/"id": "([^"]+)"/)?.[1];
      match(String(idOf(a)), /^ids-a_svg__/);
      match(String(idOf(b)), /^ids-b_svg__/);
      notStrictEqual(idOf(a), idOf(b));
    });

    it("rewrites url(#id) references to the prefixed id", () => {
      const a = loadSvg("./tests/fixtures/ids-a.svg");
      const id = a.match(/"id": "([^"]+)"/)?.[1];
      ok(id);
      ok(a.includes(`url(#${id})`));
      doesNotMatch(a, /url\(#grad\)/);
    });
  });

  describe("#85 — SVGs are inlined, not fetched", () => {
    it("inlines the path data in the module", () => {
      const source = readFileSync("./tests/fixtures/sized-icon.svg", "utf-8");
      ok(source.includes("M0 0h20v20H0z"));
      const code = loadRaw("./tests/fixtures/sized-icon.svg");
      match(code, /"d": "M0 0h20v20H0z"/);
    });

    it("emits no asset URL import", () => {
      const code = loadRaw("./tests/fixtures/sized-icon.svg");
      const imports = code.match(/^import .+$/gm) ?? [];
      strictEqual(imports.length, 1);
      match(imports[0], /from "react";$/);
    });
  });

  describe("#110, #127 — plain SVG imports stay assets", () => {
    // Only `?react` is claimed, so `import url from './x.svg'` keeps working
    // and the file is still emitted by Vite's asset pipeline.
    const plugin = svgx();

    for (const id of [
      "/foo/bar.svg",
      "/foo/bar.svg?url",
      "/foo/bar.svg?inline",
      "/foo/bar.svg?raw",
    ]) {
      it(`ignores ${id}`, () => {
        strictEqual((plugin.load as Function).call({}, id), undefined);
      });
    }
  });

  describe("#72, #90, #136 — resolveId keeps the ?react request", () => {
    /**
     * Minimal plugin-context stub: resolves relative sources against the
     * importer's directory the way Vite would, and records every call.
     */
    function stubContext() {
      const calls: Array<{ source: string; importer?: string }> = [];
      return {
        calls,
        ctx: {
          async resolve(source: string, importer?: string) {
            calls.push({ source, importer });
            const id = source.startsWith("/")
              ? "/root" + source
              : "/root/src/" + source.replace(/^\.\//, "");
            return { id };
          },
        },
      };
    }

    it("resolves the bare file path and re-appends ?react", async () => {
      const plugin = svgx();
      const { ctx, calls } = stubContext();
      const resolved = await (plugin.resolveId as Function).call(
        ctx,
        "./icons/spinner.svg?react",
        "/root/src/App.tsx",
      );
      strictEqual(resolved, "/root/src/icons/spinner.svg?react");
      strictEqual(calls[0].source, "./icons/spinner.svg");
      strictEqual(calls[0].importer, "/root/src/App.tsx");
    });

    it("delegates root-absolute (publicDir style) paths to Vite", async () => {
      const plugin = svgx();
      const { ctx, calls } = stubContext();
      const resolved = await (plugin.resolveId as Function).call(
        ctx,
        "/asset1.svg?react",
        "/root/src/App.tsx",
      );
      strictEqual(calls[0].source, "/asset1.svg");
      strictEqual(resolved, "/root/asset1.svg?react");
    });

    it("ignores sources without ?react", async () => {
      const plugin = svgx();
      const { ctx, calls } = stubContext();
      strictEqual(
        await (plugin.resolveId as Function).call(ctx, "./icons/spinner.svg", "/root/src/App.tsx"),
        undefined,
      );
      strictEqual(
        await (plugin.resolveId as Function).call(ctx, "./styles.css", "/root/src/App.tsx"),
        undefined,
      );
      strictEqual(calls.length, 0);
    });
  });

  describe("#7, #95 — component names are always valid identifiers", () => {
    // svgr silently left the module id in place when its include filter missed,
    // producing createElement('/assets/101-021d24df.svg') and "incorrect casing"
    // warnings for files like `100.svg`.
    const tree = parse('<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>');

    const cases: Array<[string, string]> = [
      ["/icons/100.svg", "Svg100"],
      ["/assets/101-021d24df.svg", "Svg101021d24df"],
      ["/icons/icon.dark.svg", "SvgIconDark"],
      ["/icons/arrow left.svg", "SvgArrowLeft"],
      ["/icons/ARROW_LEFT.svg", "SvgARROWLEFT"],
    ];

    for (const [filepath, expected] of cases) {
      it(`${filepath} → ${expected}`, () => {
        const code = generateComponent(tree, filepath);
        const declared = code.match(/function (\S+)\(props\)/)?.[1];
        strictEqual(declared, expected);
        // must start uppercase, or React treats it as an HTML tag
        match(String(declared), /^[A-Z][A-Za-z0-9]*$/);
      });
    }
  });

  describe("#121, #137, #122 — dependency footprint", () => {
    const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

    it("has no runtime dependencies", () => {
      strictEqual(pkg.dependencies, undefined);
    });

    it("peer-depends on vite only, as an open range", () => {
      strictEqual(Object.keys(pkg.peerDependencies).join(), "vite");
      match(pkg.peerDependencies.vite, /^>=\d+$/);
    });

    it("treats svgo as optional", () => {
      strictEqual(pkg.peerDependenciesMeta.svgo.optional, true);
    });
  });
});
