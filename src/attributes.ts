import { ATTRIBUTE_MAPPING, EVENT_PREFIXES } from "./constants.ts";

/**
 * The only namespace prefixes React has camelCased prop names for — its
 * `possibleStandardNames` lists `xlink:*`, `xml:*` and `xmlns:xlink`, nothing
 * else. Prefixes from authoring tools (`sodipodi:`, `inkscape:`, `dc:`) have no
 * React name, so camelCasing them would emit a bogus flattened attribute
 * (`inkscape:zoom` → `inkscapeZoom` → `inkscapezoom` in the DOM).
 */
const REACT_NAMESPACE_PREFIXES = ["xlink:", "xml:", "xmlns:"];

/**
 * Convert an HTML/SVG attribute name to its JSX equivalent.
 * Returns the converted name.
 */
export function convertAttributeName(name: string): string {
  // Static lookup
  if (name in ATTRIBUTE_MAPPING) return ATTRIBUTE_MAPPING[name];

  // Event handler transform: onclick → onClick, onmouseup → onMouseUp
  if (/^on[a-z]+$/.test(name)) {
    return "on" + capitalizeEventBody(name.slice(2));
  }

  // Namespaced attrs: camelCase the prefixes React knows (xlink:href →
  // xlinkHref), hand the rest to the DOM with the qualified name intact.
  if (name.includes(":")) {
    return REACT_NAMESPACE_PREFIXES.some((prefix) => name.startsWith(prefix))
      ? camelCase(name)
      : name;
  }

  // Auto camelCase for hyphenated attrs (skip data-* and aria-*)
  if (name.includes("-") && !name.startsWith("data-") && !name.startsWith("aria-")) {
    return camelCase(name);
  }

  // Pass through as-is (covers viewBox, d, cx, cy, r, data-*, aria-*, etc.)
  return name;
}

function camelCase(name: string): string {
  return name.replace(/[-:]([a-z])/g, (_, c) => c.toUpperCase());
}

function capitalizeEventBody(event: string): string {
  for (const word of EVENT_PREFIXES) {
    if (event.startsWith(word)) {
      const rest = event.slice(word.length);
      const cap = word[0].toUpperCase() + word.slice(1);
      return rest.length > 0 ? cap + capitalizeEventBody(rest) : cap;
    }
  }
  return event[0].toUpperCase() + event.slice(1);
}
