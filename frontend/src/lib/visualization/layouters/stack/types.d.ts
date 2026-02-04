import type { StackFrame, StackFrameId } from "../../../code/trace/types";
import type { CodeAreaView, StackFrameView } from "../../view-module/types";

export interface StackLayouter {
  rerender(
    stack_frames: StackFrame[],
    stackViewIdMap: Map<StackFrameId, [StackFrameView, CodeAreaView]>
  ): void;

  clear(): void;
}
