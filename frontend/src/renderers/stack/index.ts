import type { StackFrame, StackFrameId } from "../../trace/types";
import type { CodeAreaView, StackFrameView } from "../view/types";

/**
 * Reference for the layout idea: https://jsfiddle.net/k2artshw/
 */
export class StackLayouter {
  private _insertionPoint: HTMLElement;
  private _insertionPointList: HTMLElement[] = [];
  private _stackViewList: [StackFrameView, CodeAreaView][] = [];

  constructor(private container: HTMLElement) {
    this._insertionPoint = container;
  }

  private push([stackFrameView, codeAreaView]: [
    StackFrameView,
    CodeAreaView
  ]): void {
    const wrapper = document.createElement("div");
    wrapper.classList.add("grid");

    wrapper.appendChild(codeAreaView.node());

    const newInsertionPoint = document.createElement("div");
    newInsertionPoint.classList.add("grid", "grid__col2");
    wrapper.appendChild(newInsertionPoint);
    newInsertionPoint.appendChild(stackFrameView.node());

    this._insertionPoint.appendChild(wrapper);
    this._insertionPointList.push(this._insertionPoint);
    // FIXME: commenting or uncommenting the following line
    // changes the stack-frame layout mode from horizontal
    // to vertical. This should be made into a setting
    // that can be customized at runtime
    // this._insertionPoint = newInsertionPoint;
    this._stackViewList.push([stackFrameView, codeAreaView]);
  }

  private pop(): void {
    const previousInsertionPoint = this._insertionPointList.pop();

    if (previousInsertionPoint === undefined) {
      throw new Error("tried to pop from an empty context stack");
    }

    previousInsertionPoint.removeChild(previousInsertionPoint.lastChild!);
    this._insertionPoint = previousInsertionPoint;
    this._stackViewList.pop();
  }

  rerender(
    stack_frames: StackFrame[],
    stackViewIdMap: Map<StackFrameId, [StackFrameView, CodeAreaView]>
  ): void {
    // find first index where the current frame is different from the new frame
    const divergentIndex = this._stackViewList.findIndex(
      (_, i) =>
        // fix: when winding the interpreted stack, this._stackViewList will have
        // more elements than stack_frames
        i > stack_frames.length - 1 ||
        this._stackViewList[i][0] !==
          stackViewIdMap.get(stack_frames[i].frame_id)?.[0]
    );

    while (
      divergentIndex !== -1 &&
      this._stackViewList.length > divergentIndex
    ) {
      this.pop();
    }

    while (this._stackViewList.length < stack_frames.length) {
      this.push(
        stackViewIdMap.get(stack_frames[this._stackViewList.length].frame_id)!
      );
    }

    // rerender the frame content
    stack_frames.forEach((stack_frame, i) =>
      this._stackViewList[i][0].rerender(stack_frame)
    );

    // highlight range in each frame
    stack_frames.forEach((stack_frame, i) =>
      this._stackViewList[i][1].highlightRange(
        stack_frame.state_line_start,
        stack_frame.state_col_start,
        stack_frame.state_line_end,
        stack_frame.state_col_end
      )
    );

    // set all stack frames as inactive, and
    // the latest frame as active
    stack_frames.forEach((_, i) => this._stackViewList[i][0].setActive(false));
    this._stackViewList[this._stackViewList.length - 1][0].setActive(true);
  }

  clear() {
    this.container.innerHTML = "";
    this._insertionPointList = [];
    this._stackViewList = [];
  }
}
