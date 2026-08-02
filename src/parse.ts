import {
  NAME_CHAR_EXTRA_RANGES,
  NAME_START_CHAR_RANGES,
  PREDEFINED_ENTITIES,
} from "./constants.ts";

export interface XElement {
  type: "element";
  tag: string;
  attributes: Record<string, string>;
  children: XNode[];
}

export interface XText {
  type: "text";
  value: string;
}

export type XNode = XElement | XText;

/**
 * Parse an XML string into a tree of {@link XElement} and {@link XText} nodes.
 * Handles mismatched tags,duplicate attributes, bare `&`, and `<` in attribute values - all throw.
 *
 * @param xml - The full XML document string
 * @returns The root element
 * @throws {Error} If the input is not well-formed XML or contains no root element
 */
export function parse(xml: string): XElement {
  let i = 0;

  /** Return the character at the current cursor position. */
  function current(): string {
    return xml[i];
  }

  /** Advance the cursor by {@link n} characters (default 1). */
  function advance(n = 1): void {
    i += n;
  }

  /** Skip over any whitespace at the current position. */
  function skipWhitespace(): void {
    while (i < xml.length && /\s/.test(xml[i])) i++;
  }

  /**
   * Read characters until the {@link stop} string is found.
   * Returns the text before the stop string and positions the cursor at its start.
   * @param stop - The delimiter string to search for
   * @param throwOnMissingStop - If `false`, tolerate missing stop string and read to end of input;
   * @returns The text from the current position up to (but not including) the stop string, or to end of input if not found and `throwOnMissingStop` is `false`
   * @throws {Error} If the stop string is not found and `throwOnMissingStop` is not `false`
   */
  function readUntil(stop: string, throwOnMissingStop = true): string {
    const start = i;
    const stopIndex = xml.indexOf(stop, i);
    if (stopIndex === -1) {
      if (!throwOnMissingStop) {
        i = xml.length;
        return xml.slice(start);
      }
      throw new Error(`Expected '${stop}' at position ${start}`);
    }
    i = stopIndex;
    return xml.slice(start, stopIndex);
  }

  /**
   * Read an XML Name token (element or attribute name) starting at the
   * current position. Returns an empty string if the current character
   * is not a valid NameStartChar.
   */
  function readName(): string {
    const start = i;
    if (i < xml.length) {
      const first = xml.codePointAt(i)!;
      if (isNameStartChar(first)) {
        i += first > 0xffff ? 2 : 1;
        while (i < xml.length) {
          const cp = xml.codePointAt(i)!;
          if (!isNameChar(cp)) break;
          i += cp > 0xffff ? 2 : 1;
        }
      }
    }
    return xml.slice(start, i);
  }

  /**
   * Parse attribute key-value pairs from the current position until
   * `>` or `/` is reached. Decodes entity references in values and
   * enforces well-formedness (no duplicate attributes, no `<` in values).
   * @throws {Error} On duplicate attribute names or `<` in an attribute value
   */
  function readAttributes(): Record<string, string> {
    const attributes: Record<string, string> = {};

    while (i < xml.length) {
      skipWhitespace();
      if (current() === "/" || current() === ">") break;

      const name = readName();
      if (!name) break;
      if (name in attributes) throw new Error(`Duplicate attribute: ${name}`);

      // Valueless attribute (e.g. `hidden`)
      skipWhitespace();
      if (current() !== "=") {
        attributes[name] = "";
        continue;
      }
      advance(); // =
      skipWhitespace();

      // Quoted value
      const quote = current();
      if (quote !== '"' && quote !== "'")
        throw new Error(
          `Unquoted attribute value for '${name}' at position ${i}`,
        );

      advance(); // opening quote
      const raw = readUntil(quote);
      advance(); // closing quote

      if (raw.includes("<"))
        throw new Error(`'<' not allowed in attribute value`);

      attributes[name] = decodeReferences(raw);
    }

    return attributes;
  }

  /**
   * Recursively parse child nodes (elements, text, comments, CDATA,
   * processing instructions, and DOCTYPE declarations) until a closing
   * tag or end of input is reached.
   * @throws {Error} On mismatched or unclosed tags
   */
  function parseChildren(): XNode[] {
    const children: XNode[] = [];
    while (i < xml.length) {
      if (current() !== "<") {
        // Trailing text after the last element is valid (just whitespace or
        // text content) — reaching EOF without another '<' is not an error.
        const text = readUntil("<", false);
        if (text.trim())
          children.push({ type: "text", value: decodeReferences(text) });
        continue;
      }

      // Closing tag — break to let caller validate and consume
      if (xml[i + 1] === "/") {
        break;
      }

      // Comment: <!-- ... -->
      if (xml.startsWith("<!--", i)) {
        advance(4); // skip past "<!--"
        readUntil("-->"); // reads content, cursor now at "-->"
        advance(3); // skip past "-->"
        continue;
      }

      // CDATA: <![CDATA[ ... ]]>  (content is literal, no reference decoding)
      if (xml.startsWith("<![CDATA[", i)) {
        advance(9);
        const text = readUntil("]]>");
        advance(3);
        if (text.trim()) children.push({ type: "text", value: text });
        continue;
      }

      // DOCTYPE: <!DOCTYPE ... >  (may contain internal subset [...])
      if (xml.startsWith("<!DOCTYPE", i)) {
        advance(9);
        let depth = 0;
        while (i < xml.length) {
          if (xml[i] === "[") depth++;
          else if (xml[i] === "]") depth--;
          else if (xml[i] === ">" && depth === 0) {
            advance();
            break;
          }
          advance();
        }
        continue;
      }

      // Processing instruction: <? ... ?>
      if (xml[i + 1] === "?") {
        advance(2);
        readUntil("?>");
        advance(2);
        continue;
      }

      // Other <! constructs (skip) — we don't recognise these, so we
      // tolerate a missing '>' and just consume to EOF rather than throwing.
      if (xml[i + 1] === "!") {
        advance(2);
        readUntil(">", false);
        advance(1);
        continue;
      }

      // Opening tag
      advance(); // <
      const tag = readName();
      if (!tag)
        throw new Error(`Invalid XML: expected element name at position ${i}`);
      const attributes = readAttributes();
      skipWhitespace();

      if (current() === "/") {
        advance(2); // />
        children.push({
          type: "element",
          tag,
          attributes,
          children: [],
        });
        continue;
      }

      advance(); // >

      // Raw text elements: read content verbatim until the closing tag
      const RAW_TEXT_TAGS = new Set(["style", "script"]);
      const lowerTag = tag.toLowerCase();
      let elementChildren: XNode[];

      if (RAW_TEXT_TAGS.has(lowerTag)) {
        const closePattern = `</${tag}`;
        let raw = readUntil(closePattern);
        // Strip CDATA wrappers so markers don't leak into rendered CSS/JS
        raw = raw.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "");
        elementChildren = raw.trim()
          ? [{ type: "text" as const, value: raw }]
          : [];
      } else {
        elementChildren = parseChildren();
      }

      // Validate and consume closing tag
      if (i >= xml.length || xml[i] !== "<" || xml[i + 1] !== "/") {
        throw new Error(`Unclosed element: <${tag}>`);
      }
      advance(2); // </
      const closeTag = readName();
      if (closeTag !== tag) {
        throw new Error(
          `Mismatched closing tag: expected </${tag}>, got </${closeTag}>`,
        );
      }
      skipWhitespace();
      advance(); // >

      children.push({
        type: "element",
        tag,
        attributes,
        children: elementChildren,
      });
    }
    return children;
  }

  const nodes = parseChildren();
  const root = nodes.find((n): n is XElement => n.type === "element");
  if (!root) throw new Error("No root element found in SVG");
  return root;
}

/**
 * Decode XML character references and the five predefined entity references.
 *
 * Handles three forms:
 * - Hex numeric:   &#xHHH;  → character at codepoint 0xHHH
 * - Decimal numeric: &#NNN; → character at codepoint NNN
 * - Named entity:  &name;   → one of the 5 predefined XML entities (lt, gt, amp, apos, quot)
 *
 * Also detects bare '&' (not followed by a valid reference) which is invalid XML.
 */
function decodeReferences(s: string): string {
  // Regex matches either a valid reference (&...;) or a bare '&'
  // The alternation `|&` at the end catches bare ampersands for error reporting
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);|&/g, (_match, ref) => {
    // If ref is undefined, we matched a bare '&' (the `|&` branch)
    if (ref === undefined)
      throw new Error(`Invalid XML: bare '&' must be escaped as '&amp;'`);

    // Hex character reference: &#x41; → "A"
    if (ref.startsWith("#x"))
      return String.fromCodePoint(parseInt(ref.slice(2), 16));

    // Decimal character reference: &#65; → "A"
    if (ref.startsWith("#"))
      return String.fromCodePoint(parseInt(ref.slice(1), 10));

    // Named entity reference: &lt; → "<", &amp; → "&", etc.
    const ch = PREDEFINED_ENTITIES[ref];
    if (ch !== undefined) return ch;

    // Unknown named entity (XML doesn't allow custom entities without a DTD)
    throw new Error(`Undeclared entity reference: &${ref};`);
  });
}

function inRanges(
  char: number,
  ranges: readonly (readonly [number] | readonly [number, number])[],
): boolean {
  return ranges.some(([lo, hi]) => char >= lo && char <= (hi ?? lo));
}

/** Test whether a code point is a valid XML NameStartChar (XML 1.0 §2.3). */
function isNameStartChar(char: number): boolean {
  return inRanges(char, NAME_START_CHAR_RANGES);
}

/** Test whether a code point is a valid XML NameChar (XML 1.0 §2.3). */
function isNameChar(char: number): boolean {
  return isNameStartChar(char) || inRanges(char, NAME_CHAR_EXTRA_RANGES);
}
