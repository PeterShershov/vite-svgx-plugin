[![CI](https://github.com/PeterShershov/vite-svgx-plugin/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/PeterShershov/vite-svgx-plugin/actions/workflows/ci.yml)

<p align="center">
  <img src="./svgx-logo.svg" alt="vite-svgx-plugin" width="200" />
</p>

# vite-svgx-plugin

Import SVG files as React components in Vite with zero runtime overhead.

```tsx
import ArrowLeft from "./icons/arrow-left.svg?react";

<ArrowLeft className="icon" onClick={handleClick} />;
```

## Setup

Requires **Vite ≥ 7**.

```ts
// vite.config.ts
import svgx from "vite-svgx-plugin";

export default defineConfig({ plugins: [svgx()] });
```

Each imported SVG is typed as `(props: SVGProps<SVGSVGElement>) => ReactNode`. Pull in the ambient declaration for `*.svg?react` the same way you would `vite/client` - either in a `.d.ts` file:

```ts
/// <reference types="vite-svgx-plugin/client" />
```

or via `compilerOptions.types` in your `tsconfig.json`:

```json
{ "compilerOptions": { "types": ["vite-svgx-plugin/client"] } }
```

## Options

```ts
svgx({
  svgo: {
    /* SVGO config */
  }, // or false to disable. Requires `svgo` to be installed.
  forwardRef: false, // wrap with React.forwardRef, forwarding ref to the root <svg>
  memo: false, // wrap with React.memo, can be combined with `forwardRef`
  dimensions: true, // set to false to strip width/height from the root <svg>
});
```

## How it works

When a module ID matches `*.svg?react`, the plugin:

1. **Reads** the SVG file from disk
2. **Parses** the XML into an element tree with a character-level parser
3. **Emits** a JS module that default-exports a React component built from `createElement` calls

The SVG's original attributes are merged with props passed at the call site, so overriding `className`, `aria-label`, event handlers, etc. all work as expected.

```tsx
// generated output (simplified)
import { createElement as h } from "react";
export default function SvgArrowLeft(props) {
  return h("svg", { viewBox: "0 0 24 24", ...props }, h("path", { d: "..." }));
}
```

### Parser

The XML parser (`src/parse.ts`) is purpose-built for SVG, handling:

- Elements, attributes, text nodes, CDATA, comments, PIs, and DOCTYPE
- XML entities and character references (`&amp;`, `&#x41;`, `&#65;`)
- Well-formedness errors: mismatched tags, duplicate attributes, bare `&`, `<` in attribute values

### Attribute conversion

A static lookup table (~200 entries) maps HTML/SVG attribute names to their React JSX equivalents.

## Benchmark

> **TL;DR: on default settings svgx converts a typical icon in ~0.071 ms against svgr's ~0.38 ms — about 5× faster. With SVGO off on both sides, ~0.021 ms against ~0.33 ms — about 16×.**

Each plugin converts the same four SVG files 1,000 times. We take the middle time of those runs, so one slow run cannot skew the result.

### Results

Time to convert one file, in milliseconds.

Without SVGO:

| File               | svgx      | svgr  | speedup |
| ------------------ | --------- | ----- | ------- |
| `tiny.svg`         | **0.021** | 0.327 | 15.6×   |
| `small-icon.svg`   | **0.021** | 0.328 | 15.6×   |
| `medium-icons.svg` | **0.086** | 0.814 | 9.5×    |
| `stress-heavy.svg` | **0.629** | 5.427 | 8.6×    |

With SVGO - using the same SVGO settings:

| File               | svgx      | svgr   | speedup |
| ------------------ | --------- | ------ | ------- |
| `tiny.svg`         | **0.071** | 0.381  | 5.4×    |
| `small-icon.svg`   | **0.154** | 0.467  | 3.0×    |
| `medium-icons.svg` | **0.825** | 1.558  | 1.9×    |
| `stress-heavy.svg` | **6.209** | 10.078 | 1.6×    |

Run it yourself:

```sh
npm run bench
```

## License

MIT
