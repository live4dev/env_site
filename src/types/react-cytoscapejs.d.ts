declare module "react-cytoscapejs" {
  import type { ComponentType, CSSProperties } from "react";

  type CytoscapeComponentProps = {
    elements: unknown[];
    style?: CSSProperties;
    layout?: Record<string, unknown>;
    stylesheet?: unknown[];
    cy?: (cy: {
      on: (eventName: string, selector: string, handler: (event: { target: { data: (key: string) => unknown } }) => void) => void;
    }) => void;
  };

  const CytoscapeComponent: ComponentType<CytoscapeComponentProps>;
  export default CytoscapeComponent;
}
