declare module "*.svg?react" {
  import type { ReactNode, SVGProps } from "react";
  // A call signature rather than the global `JSX.Element` one (React 19's types
  // dropped the global JSX namespace) and rather than `FunctionComponent`, whose
  // return type is `ReactNode | Promise<ReactNode>` — that would make calling
  // the component look async. This shape stays synchronous, is assignable to
  // `ComponentType`, and is satisfied by all three outputs: the plain function,
  // `forwardRef(...)` and `memo(...)` (the latter two exotic objects, not
  // functions).
  const component: (props: SVGProps<SVGSVGElement>) => ReactNode;
  export default component;
}
