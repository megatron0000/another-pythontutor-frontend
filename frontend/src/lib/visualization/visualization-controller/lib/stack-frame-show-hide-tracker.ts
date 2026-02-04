import type { StackFrameView } from "../../view-module/types";

export class StackFrameShowHideTracker {
  private trackedStackFrames: WeakMap<
    StackFrameView,
    (intention: "show" | "hide") => void
  > = new WeakMap();

  onToggleVisibility(
    frame: StackFrameView,
    callback: (intention: "show" | "hide") => void
  ): void {
    this.trackedStackFrames.set(frame, callback);

    frame.onClickedShowHide(intention => callback(intention));
  }
}
