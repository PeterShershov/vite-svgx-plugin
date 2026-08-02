import { describe, it } from "node:test";
import { strictEqual } from "node:assert";
import { cssPropToJs, styleToObject } from "../src/style.ts";

describe("cssPropToJs", () => {
  it("passes through simple props", () => {
    strictEqual(cssPropToJs("fill"), "fill");
  });

  it("converts hyphenated to camelCase", () => {
    strictEqual(cssPropToJs("font-size"), "fontSize");
  });

  it("-webkit- → WebkitTransform", () => {
    strictEqual(cssPropToJs("-webkit-transform"), "WebkitTransform");
  });

  it("-moz- → MozAppearance", () => {
    strictEqual(cssPropToJs("-moz-appearance"), "MozAppearance");
  });

  it("-ms- → msTransform (lowercase)", () => {
    // React expects ms prefix lowercase, all others capitalized.
    // See: https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/shared/hyphenateStyleName.js
    strictEqual(cssPropToJs("-ms-transform"), "msTransform");
  });

  it("removes hyphens before digits (-ms-scrollbar-3dlight-color)", () => {
    strictEqual(
      cssPropToJs("-ms-scrollbar-3dlight-color"),
      "msScrollbar3dlightColor",
    );
  });

  it("preserves CSS custom properties", () => {
    strictEqual(cssPropToJs("--my-color"), "--my-color");
  });

  it("preserves CSS custom properties with multiple dashes", () => {
    strictEqual(cssPropToJs("--spacing-lg"), "--spacing-lg");
  });
});

describe("styleToObject", () => {
  describe("basic conversions", () => {
    it("converts a single property", () => {
      strictEqual(styleToObject("fill:red"), '{ "fill": "red" }');
    });

    it("converts multiple properties", () => {
      strictEqual(
        styleToObject("fill:red; stroke:blue"),
        '{ "fill": "red", "stroke": "blue" }',
      );
    });

    it("converts hyphenated CSS props to camelCase", () => {
      strictEqual(
        styleToObject("stroke-width:2px"),
        '{ "strokeWidth": "2px" }',
      );
    });

    it("converts mask-type:alpha", () => {
      strictEqual(styleToObject("mask-type:alpha"), '{ "maskType": "alpha" }');
    });

    it("handles multiple hyphenated properties", () => {
      strictEqual(
        styleToObject("font-size:12px; font-weight:bold; text-decoration:none"),
        '{ "fontSize": "12px", "fontWeight": "bold", "textDecoration": "none" }',
      );
    });

    it("handles empty string", () => {
      strictEqual(styleToObject(""), "{}");
    });
  });

  describe("whitespace and formatting", () => {
    it("handles spaces around colon and semicolon", () => {
      strictEqual(
        styleToObject("fill : red ; stroke : blue"),
        '{ "fill": "red", "stroke": "blue" }',
      );
    });

    it("handles trailing semicolon", () => {
      strictEqual(styleToObject("fill:red;"), '{ "fill": "red" }');
    });
  });

  describe("vendor prefixes", () => {
    it("converts -webkit- prefix", () => {
      strictEqual(
        styleToObject("-webkit-transform:rotate(45deg)"),
        '{ "WebkitTransform": "rotate(45deg)" }',
      );
    });

    it("converts -moz- prefix", () => {
      strictEqual(
        styleToObject("-moz-appearance:none"),
        '{ "MozAppearance": "none" }',
      );
    });

    it("converts -ms- prefix to lowercase ms", () => {
      strictEqual(
        styleToObject("-ms-transform:rotate(45deg)"),
        '{ "msTransform": "rotate(45deg)" }',
      );
    });

    it("handles multiple vendor-prefixed transitions", () => {
      strictEqual(
        styleToObject(
          "-webkit-transition: all 4s ease; -moz-transition: all 4s ease; -ms-transition: all 4s ease; -o-transition: all 4s ease; transition: all 4s ease",
        ),
        '{ "WebkitTransition": "all 4s ease", "MozTransition": "all 4s ease", "msTransition": "all 4s ease", "OTransition": "all 4s ease", "transition": "all 4s ease" }',
      );
    });

    it("handles multiple same-prop with value prefixes (last wins in JS)", () => {
      strictEqual(
        styleToObject(
          "display: -webkit-box; display: -ms-flexbox; display: flex",
        ),
        '{ "display": "-webkit-box", "display": "-ms-flexbox", "display": "flex" }',
      );
    });
  });

  describe("CSS custom properties", () => {
    it("preserves CSS custom properties as-is", () => {
      strictEqual(styleToObject("--my-color:red"), '{ "--my-color": "red" }');
    });

    it("preserves CSS custom properties with var() values", () => {
      strictEqual(
        styleToObject("fill:var(--primary); --gap:8px"),
        '{ "fill": "var(--primary)", "--gap": "8px" }',
      );
    });
  });

  describe("complex values", () => {
    it("handles value with spaces", () => {
      strictEqual(
        styleToObject("font-family:Arial, sans-serif"),
        '{ "fontFamily": "Arial, sans-serif" }',
      );
    });

    it("handles value with parentheses", () => {
      strictEqual(
        styleToObject("clip-path:url(#clip); fill:rgb(255, 0, 0)"),
        '{ "clipPath": "url(#clip)", "fill": "rgb(255, 0, 0)" }',
      );
    });

    it("handles nested parentheses (calc with var)", () => {
      strictEqual(
        styleToObject("width:calc(100% - var(--x, 10px)); fill:red"),
        '{ "width": "calc(100% - var(--x, 10px))", "fill": "red" }',
      );
    });

    it("handles compound shorthand values", () => {
      strictEqual(
        styleToObject("border: 5px solid #BADA55"),
        '{ "border": "5px solid #BADA55" }',
      );
    });

    it("handles decimal values starting with dot", () => {
      strictEqual(styleToObject("font-size: .75em"), '{ "fontSize": ".75em" }');
    });

    it("handles gradient function values", () => {
      strictEqual(
        styleToObject(
          "background: -webkit-linear-gradient(90deg, black, #111)",
        ),
        '{ "background": "-webkit-linear-gradient(90deg, black, #111)" }',
      );
    });

    it("preserves !important in values", () => {
      strictEqual(
        styleToObject("fill:red !important"),
        '{ "fill": "red !important" }',
      );
    });
  });

  describe("URLs", () => {
    it("handles values containing colons (url data URIs)", () => {
      strictEqual(
        styleToObject("background:url(data:image/png;base64,abc)"),
        '{ "background": "url(data:image/png;base64,abc)" }',
      );
    });

    it("handles double-quoted url()", () => {
      strictEqual(
        styleToObject('background: url("image.png")'),
        '{ "background": "url(\\"image.png\\")" }',
      );
    });

    it("handles single-quoted url()", () => {
      strictEqual(
        styleToObject("background: url('image.png')"),
        '{ "background": "url(\'image.png\')" }',
      );
    });
  });

  describe("quoted strings", () => {
    it("handles quoted string values", () => {
      strictEqual(
        styleToObject('content: "Lorem ipsum"'),
        '{ "content": "\\"Lorem ipsum\\"" }',
      );
    });

    it("handles semicolons inside double-quoted strings", () => {
      strictEqual(
        styleToObject('content: "foo; bar"; color: red'),
        '{ "content": "\\"foo; bar\\"", "color": "red" }',
      );
    });

    it("handles semicolons inside single-quoted strings", () => {
      strictEqual(
        styleToObject("content: 'hello; world'"),
        '{ "content": "\'hello; world\'" }',
      );
    });

    it("handles font-family with semicolons in quotes", () => {
      strictEqual(
        styleToObject("font-family: 'My; Font'; color: red"),
        '{ "fontFamily": "\'My; Font\'", "color": "red" }',
      );
    });

    it("handles backslash-escaped quotes in strings", () => {
      strictEqual(
        styleToObject("content: 'it\\'s;\\' escaped'; color: red"),
        '{ "content": "\'it\\\\\'s;\\\\\' escaped\'", "color": "red" }',
      );
    });
  });

  describe("CSS comments", () => {
    it("strips CSS comments", () => {
      strictEqual(
        styleToObject("fill:red; /* color */ stroke:blue"),
        '{ "fill": "red", "stroke": "blue" }',
      );
    });

    it("strips CSS comments adjacent to values", () => {
      strictEqual(styleToObject("fill:/* inline */red"), '{ "fill": "red" }');
    });

    it("strips multi-line CSS comments", () => {
      strictEqual(
        styleToObject("fill:red;\n/* multi\nline\ncomment */\nstroke:blue"),
        '{ "fill": "red", "stroke": "blue" }',
      );
    });
  });

  describe("malformed input", () => {
    it("skips declaration with no colon", () => {
      strictEqual(styleToObject("not-a-declaration"), "{}");
    });

    it("skips empty prop (leading colon)", () => {
      strictEqual(styleToObject(":red"), "{}");
    });

    it("skips empty value (trailing colon)", () => {
      strictEqual(styleToObject("fill:"), "{}");
    });

    it("skips garbage but keeps valid declarations", () => {
      strictEqual(
        styleToObject("garbage; fill:red; also bad; stroke:blue"),
        '{ "fill": "red", "stroke": "blue" }',
      );
    });

    it("handles only semicolons", () => {
      strictEqual(styleToObject(";;;"), "{}");
    });

    it("handles only whitespace", () => {
      strictEqual(styleToObject("   "), "{}");
    });
  });
});
