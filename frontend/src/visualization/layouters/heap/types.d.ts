import type {
  HeapElementId,
  StackFrameId,
  Step
} from "../../../code/trace/types";
import type { HeapElementView, StackFrameView } from "../../view-module/types";

export interface HeapLayouter {
  /**
   * Requires `step` because the layouter needs to know who references
   * who, in order to calculate coordinates
   */
  rerender(
    step: Step,
    heapViewsIdMap: Map<HeapElementId, HeapElementView>,
    frameViewsIdMap: Map<StackFrameId, StackFrameView>,
    /**
     * Views which should not be moved
     */
    fixedViews: HeapElementView[]
  ): void;

  clear(): void;
}
