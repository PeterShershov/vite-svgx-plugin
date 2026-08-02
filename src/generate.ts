import type { XNode, XElement } from "./parse.ts";
import { convertAttributeName } from "./attributes.ts";
import { styleToObject } from "./style.ts";
import { shouldStripAttribute } from "./constants.ts";
import { basename } from "path";

export interface GenerateOptions {
  /** Wrap the component with React.forwardRef, forwarding ref to the root svg element. */
  forwardRef?: boolean;
  /** Wrap the exported component in React.memo. */
  memo?: boolean;
  /**
   * Keep `width` and `height` attributes from the root SVG tag.
   * Set to `false` to strip them (e.g. when sizing via CSS). Defaults to `true`.
   */
  dimensions?: boolean;
}

/** Generate the full component module code from a parsed SVG tree */
export function generateComponent(
  root: XElement,
  filepath: string,
  options?: GenerateOptions,
): string {
  const name = toPascalCase(basename(filepath, ".svg"));
  const componentName = `Svg${name}`;

  // Build root <svg> props: file attrs first, then ...props spread
  const keepDimensions = options?.dimensions ?? true;
  const rootParts: string[] = [];
  for (const [rawName, rawValue] of Object.entries(root.attributes)) {
    if (shouldStripAttribute(rawName)) continue;
    if (!keepDimensions && (rawName === "width" || rawName === "height")) continue;
    const jsxName = convertAttributeName(rawName);
    if (rawName === "style") {
      rootParts.push(`${JSON.stringify(jsxName)}: ${styleToObject(rawValue)}`);
    } else {
      rootParts.push(`${JSON.stringify(jsxName)}: ${JSON.stringify(rawValue)}`);
    }
  }

  const childExprs = root.children.map(renderNode);
  const childrenStr = childExprs.length > 0 ? `, ${childExprs.join(", ")}` : "";

  const useForwardRef = options?.forwardRef ?? false;
  const useMemo = options?.memo ?? false;
  const needsConst = useForwardRef || useMemo;

  const spreadAndRef = useForwardRef ? "...props, ref" : "...props";
  const rootProps =
    rootParts.length > 0
      ? `{ ${rootParts.join(", ")}, ${spreadAndRef} }`
      : `{ ${spreadAndRef} }`;

  if (!needsConst) {
    return [
      `import { createElement as h } from "react";`,
      `export default function ${componentName}(props) {`,
      `  return h("svg", ${rootProps}${childrenStr});`,
      `}`,
    ].join("\n");
  }

  const specifiersFromReact = ["createElement as h"];
  if (useForwardRef) specifiersFromReact.push("forwardRef");
  if (useMemo) specifiersFromReact.push("memo");

  const params = useForwardRef ? "props, ref" : "props";
  const innerFn = `function ${componentName}(${params}) {\n  return h("svg", ${rootProps}${childrenStr});\n}`;
  const forwardRef = `forwardRef(${innerFn})`;
  const memo = `memo(${useForwardRef ? forwardRef : innerFn})`;

  const expression = useMemo ? memo : useForwardRef ? forwardRef : innerFn;

  return [
    `import { ${specifiersFromReact.join(", ")} } from "react";`,
    `const ${componentName} = ${expression};`,
    `export default ${componentName};`,
  ].join("\n");
}

/** Generate a props object literal string from attributes */
function propsLiteral(attributes: Record<string, string>, extra?: string): string {
  const parts: string[] = [];
  if (extra) parts.push(extra);

  for (const [rawName, rawValue] of Object.entries(attributes)) {
    if (shouldStripAttribute(rawName)) continue;

    const jsxName = convertAttributeName(rawName);

    if (rawName === "style") {
      parts.push(`${JSON.stringify(jsxName)}: ${styleToObject(rawValue)}`);
    } else {
      parts.push(`${JSON.stringify(jsxName)}: ${JSON.stringify(rawValue)}`);
    }
  }

  if (parts.length === 0) return "null";
  return `{ ${parts.join(", ")} }`;
}

/** Recursively generate createElement calls */
function renderNode(node: XNode): string {
  if (node.type === "text") {
    return JSON.stringify(node.value);
  }

  const { tag, attributes, children } = node;
  // Nested <svg>/<foreignObject> roots re-declare the prefixes their editor
  // used, so xmlns bindings are stripped at every depth, not just the root.
  const props = propsLiteral(attributes);
  const childExprs = children.map(renderNode);

  if (childExprs.length === 0) {
    return `h(${JSON.stringify(tag)}, ${props})`;
  }
  return `h(${JSON.stringify(tag)}, ${props}, ${childExprs.join(", ")})`;
}

/** kebab/snake filename → PascalCase: "arrow-left" → "ArrowLeft" */
function toPascalCase(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}
