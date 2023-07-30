import type { StackFrame, StackFrameId } from "../../trace/types";
import type { CodeAreaView, StackFrameView } from "../view/types";

export interface StackLayouter {
  rerender(
    stack_frames: StackFrame[],
    stackViewIdMap: Map<StackFrameId, [StackFrameView, CodeAreaView]>
  ): void;

  clear(): void;
}
