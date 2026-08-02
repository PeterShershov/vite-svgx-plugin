/**
 * Convert an inline style string to a JS object literal string.
 * e.g. "fill:red; stroke-width:2px" → `{ "fill": "red", "strokeWidth": "2px" }`
 */
export function styleToObject(style: string): string {
  const props: string[] = [];
  for (const decl of splitDeclarations(style)) {
    // Split on first colon only — values may contain colons (e.g. "url(http://...)")
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue; // No colon → not a valid declaration
    const prop = decl.slice(0, colonIdx).trim();
    const value = decl.slice(colonIdx + 1).trim();
    if (!prop || !value) continue; // Skip empty property or value (e.g. "top:" or ":12px")

    // JSON.stringify handles escaping and quoting for both key and value
    props.push(
      `${JSON.stringify(cssPropToJs(prop))}: ${JSON.stringify(value)}`,
    );
  }
  if (props.length === 0) return "{}";
  return `{ ${props.join(", ")} }`;
}

// Character codes used by the declaration splitter
const SINGLE_QUOTE = 39; // '
const DOUBLE_QUOTE = 34; // "
const CLOSE_PAREN = 41; //  )
const OPEN_PAREN = 40; //   (
const SEMICOLON = 59; //    ;
const ASTERISK = 42; //     *
const SLASH = 47; //        /
const BACKSLASH = 92; //    \

/**
 * Split an inline CSS style string into individual "prop: value" declarations.
 *
 * Handles in a single pass:
 * - CSS comments: /* ... *​/ are stripped entirely
 * - Quoted strings: semicolons inside '...' or "..." are preserved
 * - Parentheses: semicolons inside url()/calc()/var() are preserved
 */
function splitDeclarations(style: string): string[] {
  const result: string[] = [];
  let current = ""; // accumulates chars for the current declaration
  let depth = 0; // parenthesis nesting level — e.g. calc(var(...))
  let quote = 0; // 0 = not in a string, otherwise the charCode of the opening quote

  for (let i = 0; i < style.length; i++) {
    const cc = style.charCodeAt(i);

    // Inside a quoted string: consume until matching close quote (skip backslash-escaped quotes)
    if (quote) {
      current += style[i];
      if (cc === quote && style.charCodeAt(i - 1) !== BACKSLASH) quote = 0;
      continue;
    }

    // CSS comment: skip from /* to */
    if (cc === SLASH && style.charCodeAt(i + 1) === ASTERISK) {
      for (i += 2; i < style.length; i++) {
        if (
          style.charCodeAt(i) === ASTERISK &&
          style.charCodeAt(i + 1) === SLASH
        ) {
          i++; // skip past closing '/'
          break;
        }
      }
      continue;
    }

    // Opening quote: enter quoted string
    if (cc === SINGLE_QUOTE || cc === DOUBLE_QUOTE) {
      quote = cc;
      current += style[i];
      continue;
    }

    // Track parenthesis depth for nested functions
    if (cc === OPEN_PAREN) depth++;
    else if (cc === CLOSE_PAREN) depth--;

    // Semicolon at top level: declaration boundary
    if (cc === SEMICOLON && depth === 0) {
      result.push(current);
      current = "";
    } else {
      current += style[i];
    }
  }

  // Last declaration may not have a trailing semicolon
  if (current) result.push(current);
  return result;
}

/**
 * Convert a CSS property name to camelCase JS style property.
 * See: https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/shared/hyphenateStyleName.js
 */
export function cssPropToJs(prop: string): string {
  // CSS custom properties: --my-color → pass through as-is
  if (prop.startsWith("--")) return prop;

  // Handle vendor prefixes: -webkit-foo → WebkitFoo, -moz-foo → MozFoo, -ms-foo → msFoo
  // React expects ms prefix lowercase (msTransform), all others capitalized (WebkitTransform).
  // See: https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/shared/hyphenateStyleName.js
  if (prop.startsWith("-")) {
    const withoutDash = camelizeHyphens(prop.slice(1)); // Remove leading dash then camelize
    if (withoutDash.startsWith("ms")) return withoutDash; // ms is the only vendor prefix React expects lowercase
    return withoutDash.replace(/^([a-z])/, (_, c) => c.toUpperCase());
  }

  return camelizeHyphens(prop);
}

/**
 * Remove hyphens and capitalize the following character.
 * Uses [a-z0-9] (not just [a-z]) so hyphens before digits are also removed.
 * toUpperCase() on a digit is a no-op, which is the correct behavior:
 * e.g. "scrollbar-3dlight-color" → "scrollbar3dlightColor".
 */
function camelizeHyphens(s: string): string {
  return s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}
