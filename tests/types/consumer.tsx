/**
 * A miniature consumer of the plugin's ambient types, typechecked by
 * `tests/types.test.ts`. Mirrors the setups reported broken upstream:
 * pd4d10/vite-plugin-svgr#150, #128, #118, #111, #57, #51, #44.
 */
/// <reference path="../../src/client.d.ts" />
import type { ComponentType, ReactNode, SVGProps } from "react";
import { forwardRef, memo } from "react";
// No `icon.svg` on disk on purpose: the ambient wildcard module is the unit
// under test, and it only kicks in when normal resolution finds nothing.
import Icon from "./icon.svg?react";

// #150, #51, #44: the ambient `*.svg?react` module must resolve with no
// `/// <reference types="…/client" />` line in the consuming project.
export const plain = <Icon />;

// #118, #111, #57: standard SVG props must be accepted on the component.
export const withProps = (
  <Icon
    className="icon"
    onClick={() => {}}
    width={16}
    height={16}
    fill="currentColor"
    aria-hidden="true"
    data-testid="icon"
    style={{ color: "red" }}
  />
);

// `ref` is an ordinary prop in React 19 — it reaches the root <svg> through the
// props spread with or without the `forwardRef` option, so it must typecheck.
export const withRef = <Icon ref={(el: SVGSVGElement | null) => void el} />;

// #128: the component is synchronous, so its result is a plain ReactNode
// (not `ReactNode | Promise<ReactNode>`).
//
// Asserting this through a JSX element proves nothing — `<Icon />` is typed
// `JSX.Element` whatever the declaration says, so this line stays green even if
// the declared return type goes async.
export const asNode: ReactNode = withProps;

// Calling the component is what actually pins the return type down: React 19's
// `FunctionComponent` returns `ReactNode | Promise<ReactNode>`, so declaring the
// module with it fails here.
export const callResult: ReactNode = Icon({});

// The props must stay typed — if the declaration degraded to `any`, the
// expected error below would disappear and this file would fail to compile.
// @ts-expect-error `notARealSvgProp` is not an SVG attribute
export const rejectsUnknownProps = <Icon notARealSvgProp="nope" />;

// The declaration has to describe every shape the plugin can emit, not just the
// plain function: `forwardRef: true` and `memo: true` produce exotic objects.
type Declared = typeof Icon;
const plainShape = (props: SVGProps<SVGSVGElement>) => <svg {...props} />;
export const shapes: Declared[] = [
  plainShape,
  forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => <svg {...props} ref={ref} />),
  memo(plainShape),
];

// …and consumers must still be able to treat it as a component type.
export const asComponentType: ComponentType<SVGProps<SVGSVGElement>> = Icon;
