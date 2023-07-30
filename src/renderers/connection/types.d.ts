import type { AnchorView, View } from "../view/types";

export interface Connection {
  source: View;
  sourceOut: AnchorView;
  target: View;
  targetIn: AnchorView;
}
