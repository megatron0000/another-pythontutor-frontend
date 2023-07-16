/**
 * This module positions the elements (which are `View`s, see view.d.ts)
 * inside the visualization scene,
 * using almost the same layout algorithm as pythontutor.
 *
 * Also, this module draws the connection arrows between elements.
 */

import { BrowserJsPlumbInstance } from "@jsplumb/browser-ui";
import type { Step, HeapElementId, StackFrameId } from "../trace/types";
import type {
  AnchorView,
  CodeAreaView,
  HeapElementView,
  StackFrameView,
  View
} from "../view/types";

export interface ContextLayouter {
  /**
   * TODO: refactor to keep Views directly as arguments
   */
  rerender(
    frameIdList: StackFrameId[],
    id2CodeAreaView: Map<StackFrameId, CodeAreaView>,
    id2StackFrameView: Map<StackFrameId, StackFrameView>
  ): void;
}

export interface Connection {
  source: View;
  sourceOut: AnchorView;
  target: View;
  targetIn: AnchorView;
}

export interface ConnectionRouter {
  rerender(connections: Connection[]): void;
}

export default interface LayoutModule {
  createContextLayouter(container: HTMLElement | null): ContextLayouter;

  createConnectionRouter(
    jsplumbInstance: BrowserJsPlumbInstance
  ): ConnectionRouter;

  calculateHeapRows(
    step: Step,
    previousLayoutRows: HeapElementId[]
  ): HeapElementId[];

  calculateConnections(
    step: Step,
    heapId2View: Map<HeapElementId, HeapElementView>,
    frameId2FrameView: Map<StackFrameId, StackFrameView>
  ): Connection[];

  calculateHeapCoordinates(
    heapRows: View[],
    edges: Connection[],
    verticalMargin: number,
    horizontalMargin: number
  ): Map<View, [number, number]>;
}
