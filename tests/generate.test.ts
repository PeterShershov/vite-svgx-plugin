import { describe, it } from "node:test";
import { strictEqual, match, doesNotMatch } from "node:assert";
import { generateComponent } from "../src/generate.ts";
import type { XElement } from "../src/parse.ts";

/** Build a minimal XElement for testing */
function el(
  tag: string,
  attributes: Record<string, string> = {},
  children: XElement["children"] = [],
): XElement {
  return { type: "element", tag, attributes, children };
}

function text(value: string): { type: "text"; value: string } {
  return { type: "text", value };
}

describe("generateComponent", () => {
  describe("component naming", () => {
    it("derives PascalCase name from filename", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/arrow-left.svg");
      match(code, /function SvgArrowLeft\(/);
    });

    it("handles single-word filename", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/home.svg");
      match(code, /function SvgHome\(/);
    });

    it("handles snake_case filename", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/chevron_down.svg");
      match(code, /function SvgChevronDown\(/);
    });

    it("handles deeply nested filepath", () => {
      const root = el("svg");
      const code = generateComponent(root, "/a/b/c/close.svg");
      match(code, /function SvgClose\(/);
    });

    it("handles filename with multiple separators", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/arrow-up-right.svg");
      match(code, /function SvgArrowUpRight\(/);
    });
  });

  describe("imports and structure", () => {
    it("imports createElement from react", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/test.svg");
      match(code, /import \{ createElement as h \} from "react"/);
    });

    it("exports a default function", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/test.svg");
      match(code, /export default function SvgTest\(props\)/);
    });

    it("ends with closing brace", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/test.svg");
      strictEqual(code.endsWith("}"), true);
    });
  });

  describe("root svg attributes", () => {
    it("passes attributes as props on root svg", () => {
      const root = el("svg", { viewBox: "0 0 24 24", fill: "none" });
      const code = generateComponent(root, "/icons/test.svg");
      match(code, /"viewBox": "0 0 24 24"/);
      match(code, /"fill": "none"/);
    });

    it("spreads ...props after file attributes", () => {
      const root = el("svg", { viewBox: "0 0 24 24" });
      const code = generateComponent(root, "/icons/test.svg");
      match(code, /"viewBox": "0 0 24 24", \.\.\.props \}/);
    });

    it("includes ...props when no file attributes", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/test.svg");
      match(code, /h\("svg", \{ \.\.\.props \}\)/);
    });

    it("strips xmlns attribute", () => {
      const root = el("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
      });
      const code = generateComponent(root, "/icons/test.svg");
      strictEqual(code.includes("xmlns"), false);
      match(code, /"viewBox": "0 0 24 24"/);
    });

    it("strips xmlns:xlink attribute", () => {
      const root = el("svg", {
        "xmlns:xlink": "http://www.w3.org/1999/xlink",
        fill: "red",
      });
      const code = generateComponent(root, "/icons/test.svg");
      strictEqual(code.includes("xmlns"), false);
      match(code, /"fill": "red"/);
    });
  });

  describe("children rendering", () => {
    it("renders a single child element", () => {
      const root = el("svg", {}, [el("path", { d: "M0 0" })]);
      const code = generateComponent(root, "/icons/test.svg");
      match(code, /h\("path", \{ "d": "M0 0" \}\)/);
    });

    it("renders multiple sibling children", () => {
      const root = el("svg", {}, [
        el("rect", { x: "0", y: "0" }),
        el("circle", { cx: "10", cy: "10", r: "5" }),
      ]);
      const code = generateComponent(root, "/icons/test.svg");
      match(code, /h\("rect"/);
      match(code, /h\("circle"/);
    });

    it("renders deeply nested children", () => {
      const root = el("svg", {}, [
        el("g", {}, [el("g", {}, [el("path", { d: "M1 1" })])]),
      ]);
      const code = generateComponent(root, "/icons/test.svg");
      match(code, /h\("g", null, h\("g", null, h\("path"/);
    });

    it("renders text nodes", () => {
      const root = el("svg", {}, [el("text", {}, [text("Hello")])]);
      const code = generateComponent(root, "/icons/test.svg");
      match(code, /h\("text", null, "Hello"\)/);
    });

    it("renders child element with null props when no attributes", () => {
      const root = el("svg", {}, [el("g")]);
      const code = generateComponent(root, "/icons/test.svg");
      match(code, /h\("g", null\)/);
    });

    it("renders mixed children (elements and text)", () => {
      const root = el("svg", {}, [
        el("text", {}, [text("A"), el("tspan", {}, [text("B")])]),
      ]);
      const code = generateComponent(root, "/icons/test.svg");
      match(code, /h\("text", null, "A", h\("tspan", null, "B"\)\)/);
    });
  });

  describe("full output", () => {
    it("generates correct output for minimal svg", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg");
      const expected = [
        'import { createElement as h } from "react";',
        "export default function SvgIcon(props) {",
        '  return h("svg", { ...props });',
        "}",
      ].join("\n");
      strictEqual(code, expected);
    });

    it("generates correct output for svg with attrs and one child", () => {
      const root = el("svg", { viewBox: "0 0 24 24" }, [
        el("path", { d: "M0 0" }),
      ]);
      const code = generateComponent(root, "/icons/check.svg");
      const expected = [
        'import { createElement as h } from "react";',
        "export default function SvgCheck(props) {",
        '  return h("svg", { "viewBox": "0 0 24 24", ...props }, h("path", { "d": "M0 0" }));',
        "}",
      ].join("\n");
      strictEqual(code, expected);
    });

    it("generates correct output for svg with xmlns stripped", () => {
      const root = el(
        "svg",
        { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24" },
        [el("circle", { cx: "12", cy: "12", r: "10" })],
      );
      const code = generateComponent(root, "/icons/dot.svg");
      const expected = [
        'import { createElement as h } from "react";',
        "export default function SvgDot(props) {",
        '  return h("svg", { "viewBox": "0 0 24 24", ...props }, h("circle", { "cx": "12", "cy": "12", "r": "10" }));',
        "}",
      ].join("\n");
      strictEqual(code, expected);
    });
  });

  describe("forwardRef option", () => {
    it("imports forwardRef from react", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", {
        forwardRef: true,
      });
      match(code, /import \{ createElement as h, forwardRef \} from "react"/);
    });

    it("wraps component with forwardRef", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", {
        forwardRef: true,
      });
      match(code, /const SvgIcon = forwardRef\(function SvgIcon\(props, ref\)/);
    });

    it("includes ref in root svg props when no file attributes", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", {
        forwardRef: true,
      });
      match(code, /h\("svg", \{ \.\.\.props, ref \}\)/);
    });

    it("includes ref after spread when file attributes present", () => {
      const root = el("svg", { viewBox: "0 0 24 24" });
      const code = generateComponent(root, "/icons/icon.svg", {
        forwardRef: true,
      });
      match(code, /"viewBox": "0 0 24 24", \.\.\.props, ref \}/);
    });

    it("uses named const export default", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", {
        forwardRef: true,
      });
      match(code, /export default SvgIcon;/);
      doesNotMatch(code, /export default function/);
    });

    it("generates correct full output for minimal svg", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", {
        forwardRef: true,
      });
      const expected = [
        'import { createElement as h, forwardRef } from "react";',
        "const SvgIcon = forwardRef(function SvgIcon(props, ref) {",
        '  return h("svg", { ...props, ref });',
        "});",
        "export default SvgIcon;",
      ].join("\n");
      strictEqual(code, expected);
    });

    it("generates correct full output for svg with attrs and child", () => {
      const root = el("svg", { viewBox: "0 0 24 24" }, [
        el("path", { d: "M0 0" }),
      ]);
      const code = generateComponent(root, "/icons/check.svg", {
        forwardRef: true,
      });
      const expected = [
        'import { createElement as h, forwardRef } from "react";',
        "const SvgCheck = forwardRef(function SvgCheck(props, ref) {",
        '  return h("svg", { "viewBox": "0 0 24 24", ...props, ref }, h("path", { "d": "M0 0" }));',
        "});",
        "export default SvgCheck;",
      ].join("\n");
      strictEqual(code, expected);
    });

    it("does not use forwardRef when option is false", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", {
        forwardRef: false,
      });
      doesNotMatch(code, /forwardRef/);
      match(code, /export default function SvgIcon/);
    });

    it("does not use forwardRef when option is omitted", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg");
      doesNotMatch(code, /forwardRef/);
    });
  });

  describe("memo option", () => {
    it("imports memo from react", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", { memo: true });
      match(code, /import \{ createElement as h, memo \} from "react"/);
    });

    it("wraps component with memo", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", { memo: true });
      match(code, /const SvgIcon = memo\(/);
    });

    it("uses named const export default", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", { memo: true });
      match(code, /export default SvgIcon;/);
      doesNotMatch(code, /export default function/);
    });

    it("generates correct full output for minimal svg", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", { memo: true });
      const expected = [
        'import { createElement as h, memo } from "react";',
        "const SvgIcon = memo(function SvgIcon(props) {",
        '  return h("svg", { ...props });',
        "});",
        "export default SvgIcon;",
      ].join("\n");
      strictEqual(code, expected);
    });

    it("does not use memo when option is false", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", { memo: false });
      doesNotMatch(code, /\bmemo\b/);
      match(code, /export default function SvgIcon/);
    });

    it("does not use memo when option is omitted", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg");
      doesNotMatch(code, /\bmemo\b/);
    });

    it("combines memo and forwardRef: memo(forwardRef(fn))", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", {
        memo: true,
        forwardRef: true,
      });
      match(
        code,
        /import \{ createElement as h, forwardRef, memo \} from "react"/,
      );
      match(
        code,
        /const SvgIcon = memo\(forwardRef\(function SvgIcon\(props, ref\)/,
      );
      match(code, /h\("svg", \{ \.\.\.props, ref \}\)/);
      match(code, /export default SvgIcon;/);
    });

    it("generates correct full output for memo + forwardRef", () => {
      const root = el("svg");
      const code = generateComponent(root, "/icons/icon.svg", {
        memo: true,
        forwardRef: true,
      });
      const expected = [
        'import { createElement as h, forwardRef, memo } from "react";',
        "const SvgIcon = memo(forwardRef(function SvgIcon(props, ref) {",
        '  return h("svg", { ...props, ref });',
        "}));",
        "export default SvgIcon;",
      ].join("\n");
      strictEqual(code, expected);
    });
  });

  describe("dimensions option", () => {
    it("keeps width and height by default", () => {
      const root = el("svg", {
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
      });
      const code = generateComponent(root, "/icons/icon.svg");
      match(code, /"width": "24"/);
      match(code, /"height": "24"/);
      match(code, /"viewBox": "0 0 24 24"/);
    });

    it("keeps width and height when dimensions is true", () => {
      const root = el("svg", { width: "24", height: "24" });
      const code = generateComponent(root, "/icons/icon.svg", {
        dimensions: true,
      });
      match(code, /"width": "24"/);
      match(code, /"height": "24"/);
    });

    it("strips width and height when dimensions is false", () => {
      const root = el("svg", {
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
      });
      const code = generateComponent(root, "/icons/icon.svg", {
        dimensions: false,
      });
      doesNotMatch(code, /"width"/);
      doesNotMatch(code, /"height"/);
      match(code, /"viewBox": "0 0 24 24"/);
    });

    it("strips only width or only height if just one is present", () => {
      const root = el("svg", { width: "24", viewBox: "0 0 24 24" });
      const code = generateComponent(root, "/icons/icon.svg", {
        dimensions: false,
      });
      doesNotMatch(code, /"width"/);
      match(code, /"viewBox": "0 0 24 24"/);
    });

    it("generates correct full output when dimensions is false", () => {
      const root = el("svg", {
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
      });
      const code = generateComponent(root, "/icons/icon.svg", {
        dimensions: false,
      });
      const expected = [
        'import { createElement as h } from "react";',
        "export default function SvgIcon(props) {",
        '  return h("svg", { "viewBox": "0 0 24 24", ...props });',
        "}",
      ].join("\n");
      strictEqual(code, expected);
    });

    it("works with forwardRef and memo combined", () => {
      const root = el("svg", {
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
      });
      const code = generateComponent(root, "/icons/icon.svg", {
        dimensions: false,
        forwardRef: true,
        memo: true,
      });
      doesNotMatch(code, /"width"/);
      doesNotMatch(code, /"height"/);
      match(code, /memo\(forwardRef\(/);
      match(code, /"viewBox": "0 0 24 24"/);
    });
  });
});
