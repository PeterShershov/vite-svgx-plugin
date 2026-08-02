import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual, throws } from "node:assert";
import { parse, type XElement, type XText } from "../src/parse.ts";

/** Helper to get the first child element */
function firstChild(el: XElement): XElement {
  return el.children.find((c): c is XElement => c.type === "element")!;
}

/** Helper to get all child elements */
function childElements(el: XElement): XElement[] {
  return el.children.filter((c): c is XElement => c.type === "element");
}

/** Helper to get the first text child */
function textContent(el: XElement): string {
  const t = el.children.find((c): c is XText => c.type === "text");
  return t?.value ?? "";
}

describe("parse", () => {
  describe("basic elements", () => {
    it("parses a self-closing element", () => {
      const root = parse("<svg/>");
      strictEqual(root.tag, "svg");
      strictEqual(root.children.length, 0);
      deepStrictEqual(root.attributes, {});
    });

    it("parses a self-closing element with space before slash", () => {
      const root = parse("<svg />");
      strictEqual(root.tag, "svg");
      strictEqual(root.children.length, 0);
    });

    it("parses an element with open and close tags", () => {
      const root = parse("<svg></svg>");
      strictEqual(root.tag, "svg");
      strictEqual(root.children.length, 0);
    });

    it("parses nested elements", () => {
      const root = parse("<svg><g><path/></g></svg>");
      strictEqual(root.tag, "svg");
      const g = firstChild(root);
      strictEqual(g.tag, "g");
      const path = firstChild(g);
      strictEqual(path.tag, "path");
      strictEqual(path.children.length, 0);
    });

    it("parses multiple sibling elements", () => {
      const root = parse("<svg><rect/><circle/><path/></svg>");
      const kids = childElements(root);
      strictEqual(kids.length, 3);
      strictEqual(kids[0].tag, "rect");
      strictEqual(kids[1].tag, "circle");
      strictEqual(kids[2].tag, "path");
    });

    it("parses deeply nested elements", () => {
      const root = parse("<svg><g><g><g><circle/></g></g></g></svg>");
      const level1 = firstChild(root);
      const level2 = firstChild(level1);
      const level3 = firstChild(level2);
      const circle = firstChild(level3);
      strictEqual(circle.tag, "circle");
    });
  });

  describe("attributes", () => {
    it("parses double-quoted attributes", () => {
      const root = parse('<svg width="100" height="200"></svg>');
      deepStrictEqual(root.attributes, { width: "100", height: "200" });
    });

    it("parses single-quoted attributes", () => {
      const root = parse("<svg width='100' height='200'></svg>");
      deepStrictEqual(root.attributes, { width: "100", height: "200" });
    });

    it("parses mixed quote styles", () => {
      const root = parse(`<svg width="100" height='200'></svg>`);
      deepStrictEqual(root.attributes, { width: "100", height: "200" });
    });

    it("parses attributes with special characters in values", () => {
      const root = parse('<path d="M0 0L10 10Z"/>');
      strictEqual(root.attributes.d, "M0 0L10 10Z");
    });

    it("parses attributes with spaces around equals", () => {
      const root = parse('<svg width = "100" ></svg>');
      strictEqual(root.attributes.width, "100");
    });

    it("parses hyphenated attribute names", () => {
      const root = parse('<path stroke-width="2" stroke-linecap="round"/>');
      strictEqual(root.attributes["stroke-width"], "2");
      strictEqual(root.attributes["stroke-linecap"], "round");
    });

    it("parses namespaced attribute names", () => {
      const root = parse(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>',
      );
      strictEqual(root.attributes.xmlns, "http://www.w3.org/2000/svg");
      strictEqual(
        root.attributes["xmlns:xlink"],
        "http://www.w3.org/1999/xlink",
      );
    });

    it("parses xlink:href", () => {
      const root = parse('<svg><use xlink:href="#icon"/></svg>');
      const use = firstChild(root);
      strictEqual(use.attributes["xlink:href"], "#icon");
    });

    it("parses attributes with empty values", () => {
      const root = parse('<svg viewBox=""></svg>');
      strictEqual(root.attributes.viewBox, "");
    });

    it("handles boolean-like attributes without values", () => {
      const root = parse("<svg hidden></svg>");
      strictEqual(root.attributes.hidden, "");
    });

    it("parses many attributes", () => {
      const root = parse(
        '<svg width="77" height="47" fill="none" aria-labelledby="title" viewBox="0 0 77 47"></svg>',
      );
      deepStrictEqual(root.attributes, {
        width: "77",
        height: "47",
        fill: "none",
        "aria-labelledby": "title",
        viewBox: "0 0 77 47",
      });
    });

    it("parses attributes on child elements", () => {
      const root = parse('<svg><circle cx="10" cy="20" r="5"/></svg>');
      const circle = firstChild(root);
      deepStrictEqual(circle.attributes, { cx: "10", cy: "20", r: "5" });
    });

    it("parses inline style attribute", () => {
      const root = parse('<mask style="mask-type:alpha"></mask>');
      strictEqual(root.attributes.style, "mask-type:alpha");
    });

    it("decodes entity references in attribute values", () => {
      const root = parse('<svg data-info="a&amp;b"></svg>');
      strictEqual(root.attributes["data-info"], "a&b");
    });
  });

  describe("text content", () => {
    it("parses text inside elements", () => {
      const root = parse("<svg><title>Hello</title></svg>");
      const title = firstChild(root);
      strictEqual(title.tag, "title");
      strictEqual(textContent(title), "Hello");
    });

    it("ignores whitespace-only text nodes", () => {
      const root = parse("<svg>   \n   </svg>");
      strictEqual(root.children.length, 0);
    });

    it("preserves meaningful text with surrounding whitespace", () => {
      const root = parse("<svg><text> hello world </text></svg>");
      const text = firstChild(root);
      strictEqual(textContent(text), " hello world ");
    });

    it("handles mixed text and elements", () => {
      const root = parse(
        "<svg><text>before<tspan>inner</tspan>after</text></svg>",
      );
      const text = firstChild(root);
      strictEqual(text.children.length, 3);
      strictEqual((text.children[0] as XText).value, "before");
      strictEqual((text.children[1] as XElement).tag, "tspan");
      strictEqual((text.children[2] as XText).value, "after");
    });
  });

  describe("comments", () => {
    it("skips XML comments", () => {
      const root = parse("<svg><!-- comment --><rect/></svg>");
      const kids = childElements(root);
      strictEqual(kids.length, 1);
      strictEqual(kids[0].tag, "rect");
    });

    it("skips multi-line comments", () => {
      const root = parse("<svg><!--\n  multi\n  line\n--><rect/></svg>");
      const kids = childElements(root);
      strictEqual(kids.length, 1);
    });

    it("skips comments between elements", () => {
      const root = parse("<svg><rect/><!-- between --><circle/></svg>");
      const kids = childElements(root);
      strictEqual(kids.length, 2);
      strictEqual(kids[0].tag, "rect");
      strictEqual(kids[1].tag, "circle");
    });
  });

  describe("processing instructions and doctype", () => {
    it("skips XML processing instruction", () => {
      const root = parse('<?xml version="1.0" encoding="UTF-8"?><svg></svg>');
      strictEqual(root.tag, "svg");
    });

    it("skips DOCTYPE", () => {
      const root = parse(
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg></svg>',
      );
      strictEqual(root.tag, "svg");
    });

    it("skips both PI and DOCTYPE", () => {
      const root = parse(
        '<?xml version="1.0"?><!DOCTYPE svg><svg><rect/></svg>',
      );
      strictEqual(root.tag, "svg");
      strictEqual(childElements(root).length, 1);
    });
  });

  describe("CDATA sections", () => {
    it("parses CDATA as text", () => {
      const root = parse(
        "<svg><desc><![CDATA[Some <description> here]]></desc></svg>",
      );
      const desc = firstChild(root);
      strictEqual(textContent(desc), "Some <description> here");
    });

    it("ignores empty CDATA", () => {
      const root = parse("<svg><desc><![CDATA[   ]]></desc></svg>");
      const desc = firstChild(root);
      strictEqual(desc.children.length, 0);
    });
  });

  describe("style and script elements", () => {
    it("parses style element content", () => {
      const root = parse("<svg><style>.cls{fill:#000}</style></svg>");
      const style = firstChild(root);
      strictEqual(style.tag, "style");
      strictEqual(textContent(style), ".cls{fill:#000}");
    });

    it("preserves style content with > in selectors", () => {
      const root = parse("<svg><style>svg > g { fill: red }</style></svg>");
      const style = firstChild(root);
      strictEqual(textContent(style), "svg > g { fill: red }");
    });

    it("preserves style content with media queries", () => {
      const css =
        ".p{fill:#000}@media (prefers-color-scheme:dark){.p{fill:#fff}}";
      const root = parse(`<svg><style>${css}</style></svg>`);
      const style = firstChild(root);
      strictEqual(textContent(style), css);
    });

    it("handles empty style element", () => {
      const root = parse("<svg><style></style></svg>");
      const style = firstChild(root);
      strictEqual(style.children.length, 0);
    });

    it("parses script element with entity-escaped content verbatim", () => {
      const root = parse("<svg><script>var x = 1 &lt; 2;</script></svg>");
      const script = firstChild(root);
      strictEqual(script.tag, "script");
      strictEqual(textContent(script), "var x = 1 &lt; 2;");
    });

    it("strips CDATA wrappers from script content", () => {
      const root = parse(
        "<svg><script><![CDATA[var x = 1 < 2;]]></script></svg>",
      );
      const script = firstChild(root);
      strictEqual(script.tag, "script");
      strictEqual(textContent(script), "var x = 1 < 2;");
    });

    it("strips CDATA wrappers from style content", () => {
      const root = parse(
        "<svg><style><![CDATA[ .a > .b { color: red } ]]></style></svg>",
      );
      const style = firstChild(root);
      strictEqual(textContent(style), " .a > .b { color: red } ");
    });

    it("preserves bare & in style content", () => {
      const root = parse(`<svg><style>.a { content: "&"; }</style></svg>`);
      const style = firstChild(root);
      strictEqual(textContent(style), `.a { content: "&"; }`);
    });

    it("preserves bare & in script content", () => {
      const root = parse(`<svg><script>var x = a && b;</script></svg>`);
      const script = firstChild(root);
      strictEqual(textContent(script), "var x = a && b;");
    });

    it("preserves < in script content", () => {
      const root = parse(`<svg><script>if (a < b) {}</script></svg>`);
      const script = firstChild(root);
      strictEqual(textContent(script), "if (a < b) {}");
    });

    it("preserves style content with multiple < and & characters", () => {
      const css = `.a > .b { color: red } .c + .d & { font-size: 1em }`;
      const root = parse(`<svg><style>${css}</style></svg>`);
      const style = firstChild(root);
      strictEqual(textContent(style), css);
    });

    it("handles style with attributes", () => {
      const root = parse(
        `<svg><style type="text/css">.st0{fill:#FFF}</style></svg>`,
      );
      const style = firstChild(root);
      strictEqual(style.tag, "style");
      strictEqual(style.attributes["type"], "text/css");
      strictEqual(textContent(style), ".st0{fill:#FFF}");
    });
  });

  describe("self-closing tags", () => {
    it("handles common self-closing SVG elements", () => {
      const root = parse(
        '<svg><path d="M0 0"/><line x1="0" y1="0" x2="1" y2="1"/><circle r="5"/><ellipse rx="3" ry="5"/><rect width="10" height="10"/><polyline points="0,0 1,1"/><polygon points="0,0 1,1 2,0"/></svg>',
      );
      const kids = childElements(root);
      strictEqual(kids.length, 7);
      deepStrictEqual(
        kids.map((k) => k.tag),
        ["path", "line", "circle", "ellipse", "rect", "polyline", "polygon"],
      );
    });
  });

  describe("SVG-specific structures", () => {
    it("parses defs with nested elements", () => {
      const root = parse(`
        <svg>
          <defs>
            <linearGradient id="grad">
              <stop offset="0%" stop-color="red"/>
              <stop offset="100%" stop-color="blue"/>
            </linearGradient>
          </defs>
        </svg>
      `);
      const defs = firstChild(root);
      strictEqual(defs.tag, "defs");
      const gradient = firstChild(defs);
      strictEqual(gradient.tag, "linearGradient");
      strictEqual(gradient.attributes.id, "grad");
      const stops = childElements(gradient);
      strictEqual(stops.length, 2);
      strictEqual(stops[0].attributes["stop-color"], "red");
      strictEqual(stops[1].attributes["stop-color"], "blue");
    });

    it("parses clipPath elements", () => {
      const root = parse(
        '<svg><defs><clipPath id="clip"><rect width="10" height="10"/></clipPath></defs></svg>',
      );
      const defs = firstChild(root);
      const clipPath = firstChild(defs);
      strictEqual(clipPath.tag, "clipPath");
      strictEqual(clipPath.attributes.id, "clip");
      const rect = firstChild(clipPath);
      strictEqual(rect.tag, "rect");
    });

    it("parses mask elements with style", () => {
      const root = parse(
        '<svg><mask id="a" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path fill="#000" d="M0 0h10v10H0z"/></mask></svg>',
      );
      const mask = firstChild(root);
      strictEqual(mask.tag, "mask");
      strictEqual(mask.attributes.style, "mask-type:alpha");
      strictEqual(mask.attributes.maskUnits, "userSpaceOnUse");
    });

    it("parses filter chains", () => {
      const root = parse(`
        <svg>
          <filter id="f" filterUnits="userSpaceOnUse">
            <feFlood flood-opacity="0" result="bg"/>
            <feBlend in="SourceGraphic" in2="bg" result="shape"/>
            <feGaussianBlur stdDeviation="7" result="blur"/>
          </filter>
        </svg>
      `);
      const filter = firstChild(root);
      strictEqual(filter.tag, "filter");
      const children = childElements(filter);
      strictEqual(children.length, 3);
      strictEqual(children[0].tag, "feFlood");
      strictEqual(children[0].attributes["flood-opacity"], "0");
      strictEqual(children[1].tag, "feBlend");
      strictEqual(children[2].tag, "feGaussianBlur");
      strictEqual(children[2].attributes.stdDeviation, "7");
    });

    it("parses symbol elements", () => {
      const root = parse(
        '<svg><symbol id="icon" viewBox="0 0 16 16"><path d="M0 0"/></symbol></svg>',
      );
      const symbol = firstChild(root);
      strictEqual(symbol.tag, "symbol");
      strictEqual(symbol.attributes.id, "icon");
      strictEqual(symbol.attributes.viewBox, "0 0 16 16");
    });

    it("parses use elements", () => {
      const root = parse('<svg><use href="#icon" x="0" y="0"/></svg>');
      const use = firstChild(root);
      strictEqual(use.tag, "use");
      strictEqual(use.attributes.href, "#icon");
    });

    it("parses g elements with transforms", () => {
      const root = parse(
        '<svg><g transform="translate(10, 20) rotate(45)"><rect/></g></svg>',
      );
      const g = firstChild(root);
      strictEqual(g.attributes.transform, "translate(10, 20) rotate(45)");
    });

    it("parses title and desc", () => {
      const root = parse(
        "<svg><title>My Icon</title><desc>An icon</desc><rect/></svg>",
      );
      const kids = childElements(root);
      strictEqual(kids[0].tag, "title");
      strictEqual(textContent(kids[0]), "My Icon");
      strictEqual(kids[1].tag, "desc");
      strictEqual(textContent(kids[1]), "An icon");
      strictEqual(kids[2].tag, "rect");
    });
  });

  describe("complex path data", () => {
    it("preserves path data with all command types", () => {
      const d =
        "M10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80 Q 95 10 180 80 T 280 80 A 45 45, 0, 0, 0, 125 125 L 125 80 Z";
      const root = parse(`<svg><path d="${d}"/></svg>`);
      const path = firstChild(root);
      strictEqual(path.attributes.d, d);
    });

    it("preserves path data with negative numbers", () => {
      const d = "M40.151 45.71c-.663.844-2.02.374-2.02-.699V34.708";
      const root = parse(`<svg><path d="${d}"/></svg>`);
      const path = firstChild(root);
      strictEqual(path.attributes.d, d);
    });
  });

  describe("error handling", () => {
    it("throws on empty input", () => {
      throws(() => parse(""), { message: /No root element found/ });
    });

    it("throws on whitespace-only input", () => {
      throws(() => parse("   \n  "), { message: /No root element found/ });
    });

    it("throws on text-only input", () => {
      throws(() => parse("just text"), { message: /No root element found/ });
    });

    it("throws on comment-only input", () => {
      throws(() => parse("<!-- just a comment -->"), {
        message: /No root element found/,
      });
    });
  });

  describe("real-world SVGs", () => {
    it("parses a Figma-style export", () => {
      const svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2 17L12 22L22 17" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2 12L12 17L22 12" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
      const root = parse(svg);
      strictEqual(root.tag, "svg");
      strictEqual(root.attributes.xmlns, "http://www.w3.org/2000/svg");
      strictEqual(root.attributes.fill, "none");
      const paths = childElements(root);
      strictEqual(paths.length, 3);
      strictEqual(paths[0].attributes["stroke-linecap"], "round");
    });

    it("parses an SVG with everything: PI, defs, mask, filter, style, g, use", () => {
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- Main icon -->
  <defs>
    <clipPath id="c"><rect width="100" height="100"/></clipPath>
    <filter id="f"><feGaussianBlur stdDeviation="2"/></filter>
  </defs>
  <style>.bg{fill:#eee}</style>
  <mask id="m" style="mask-type:alpha"><circle cx="50" cy="50" r="50"/></mask>
  <g clip-path="url(#c)" mask="url(#m)" filter="url(#f)">
    <rect class="bg" width="100" height="100"/>
    <text x="50" y="55" text-anchor="middle">Icon</text>
  </g>
</svg>`;
      const root = parse(svg);
      strictEqual(root.tag, "svg");
      strictEqual(root.attributes.viewBox, "0 0 100 100");

      const kids = childElements(root);
      deepStrictEqual(
        kids.map((k) => k.tag),
        ["defs", "style", "mask", "g"],
      );

      // defs
      const defs = kids[0];
      const defsKids = childElements(defs);
      strictEqual(defsKids[0].tag, "clipPath");
      strictEqual(defsKids[1].tag, "filter");

      // style preserved as text
      strictEqual(textContent(kids[1]), ".bg{fill:#eee}");

      // mask
      strictEqual(kids[2].attributes.style, "mask-type:alpha");

      // g with multiple attrs
      const g = kids[3];
      strictEqual(g.attributes["clip-path"], "url(#c)");
      strictEqual(g.attributes.mask, "url(#m)");
      strictEqual(g.attributes.filter, "url(#f)");

      const gKids = childElements(g);
      strictEqual(gKids[0].attributes.class, "bg");
      strictEqual(gKids[1].tag, "text");
      strictEqual(gKids[1].attributes["text-anchor"], "middle");
      strictEqual(textContent(gKids[1]), "Icon");
    });
  });

  describe("entity and character references", () => {
    it("decodes &amp; in attribute values", () => {
      const root = parse('<svg data-x="a&amp;b"></svg>');
      strictEqual(root.attributes["data-x"], "a&b");
    });

    it("decodes &lt; and &gt; in attribute values", () => {
      const root = parse('<svg data-x="1 &lt; 2 &amp;&amp; 3 &gt; 2"></svg>');
      strictEqual(root.attributes["data-x"], "1 < 2 && 3 > 2");
    });

    it("decodes &apos; and &quot; in attribute values", () => {
      const root = parse(
        "<svg data-a=\"&apos;hi&apos;\" data-b='&quot;hi&quot;'></svg>",
      );
      strictEqual(root.attributes["data-a"], "'hi'");
      strictEqual(root.attributes["data-b"], '"hi"');
    });

    it("decodes decimal character references", () => {
      const root = parse('<svg data-x="&#65;&#66;&#67;"></svg>');
      strictEqual(root.attributes["data-x"], "ABC");
    });

    it("decodes hex character references", () => {
      const root = parse('<svg data-x="&#x41;&#x42;&#x43;"></svg>');
      strictEqual(root.attributes["data-x"], "ABC");
    });

    it("decodes entities in text content", () => {
      const root = parse("<svg><title>1 &lt; 2 &amp; 3 &gt; 0</title></svg>");
      const title = firstChild(root);
      strictEqual(textContent(title), "1 < 2 & 3 > 0");
    });

    it("does not decode entities inside CDATA", () => {
      const root = parse(
        "<svg><desc><![CDATA[&amp; not decoded]]></desc></svg>",
      );
      const desc = firstChild(root);
      strictEqual(textContent(desc), "&amp; not decoded");
    });

    it("decodes emoji hex reference", () => {
      const root = parse("<svg><title>&#x1F600;</title></svg>");
      const title = firstChild(root);
      strictEqual(textContent(title), "\u{1F600}");
    });

    it("throws on bare & in attribute value", () => {
      throws(() => parse('<svg data-x="a & b"></svg>'), { message: /&/ });
    });

    it("throws on bare & in text content", () => {
      throws(() => parse("<svg><title>a & b</title></svg>"), { message: /&/ });
    });

    it("throws on undeclared entity reference", () => {
      throws(() => parse('<svg data-x="&foo;"></svg>'), {
        message: /Undeclared entity/,
      });
    });
  });

  describe("well-formedness", () => {
    it("throws on mismatched closing tag", () => {
      throws(() => parse("<svg><g></svg>"), {
        message: /Mismatched closing tag/,
      });
    });

    it("throws on unclosed element", () => {
      throws(() => parse("<svg><g>"), { message: /Unclosed element/ });
    });

    it("throws on duplicate attributes", () => {
      throws(() => parse('<svg width="1" width="2"></svg>'), {
        message: /Duplicate attribute/,
      });
    });

    it("rejects < in attribute value", () => {
      throws(() => parse('<svg data-x="a<b"></svg>'), { message: /</ });
    });

    it("throws on unquoted attribute value", () => {
      throws(() => parse("<svg width=100></svg>"), {
        message: /Unquoted attribute value/,
      });
    });

    it("throws on unterminated comment", () => {
      throws(() => parse("<svg><!-- oops</svg>"), {
        message: /Expected '-->'/,
      });
    });

    it("throws on unterminated CDATA section", () => {
      throws(() => parse("<svg><desc><![CDATA[oops</desc></svg>"), {
        message: /Expected ']]>'/,
      });
    });

    it("throws on unterminated processing instruction", () => {
      throws(() => parse("<?xml oops"), {
        message: /Expected '\?>'/,
      });
    });

    it("throws on unterminated attribute value", () => {
      throws(() => parse('<svg width="100></svg>'), {
        message: /Expected '"'/,
      });
    });

    it("throws on unclosed style element", () => {
      throws(() => parse("<svg><style>.a{}</svg>"), {
        message: /Expected '<\/style'/,
      });
    });

    it("throws on unclosed script element", () => {
      throws(() => parse("<svg><script>var x=1</svg>"), {
        message: /Expected '<\/script'/,
      });
    });
  });

  describe("DOCTYPE with internal subset", () => {
    it("skips DOCTYPE with internal subset", () => {
      const svg = '<!DOCTYPE svg [<!ENTITY logo "test">]><svg><rect/></svg>';
      const root = parse(svg);
      strictEqual(root.tag, "svg");
      strictEqual(childElements(root).length, 1);
    });

    it("skips DOCTYPE with nested declarations", () => {
      const svg = `<!DOCTYPE svg [
        <!ENTITY logo "img">
        <!ELEMENT svg ANY>
      ]>
      <svg></svg>`;
      const root = parse(svg);
      strictEqual(root.tag, "svg");
    });
  });
});
