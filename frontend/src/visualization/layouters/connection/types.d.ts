import type { AnchorView, View } from "../../view-module/types";

export interface Connection {
  source: View;
  sourceOut: AnchorView;
  target: View;
  targetIn: AnchorView;
}
