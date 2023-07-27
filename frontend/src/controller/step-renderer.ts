import { diffHeap, diffStack } from "../diff";
import type { ConsoleLayouter } from "../renderers/console/types";
import type { HeapLayouter } from "../renderers/heap/types";
import type { StackLayouter } from "../renderers/stack/types";
import type { ZoomService } from "../renderers/zoom";
import type {
  HeapElement,
  HeapElementId,
  StackFrame,
  StackFrameId,
  Step
} from "../trace/types";
import type {
  CodeAreaView,
  HeapElementView,
  StackFrameView
} from "../renderers/view/types";
import {
  createCodeAreaView,
  createHeapFunctionView,
  createShallowArrayView,
  createShallowObjectView,
  createShallowStackFrameView
} from "../renderers/view";
import { DragTracker } from "./drag-tracker";

export class StepRenderer {
  private dragTracker = new DragTracker();

  constructor(
    private zoomService: ZoomService,
    private stackLayouter: StackLayouter,
    private heapLayouter: HeapLayouter,
    private consoleLayouter: ConsoleLayouter
  ) {}

  private heapViewIdMap: Map<HeapElementId, HeapElementView> = new Map();
  private stackViewIdMap: Map<StackFrameId, [StackFrameView, CodeAreaView]> =
    new Map();
  private previousStep: Step | null = null;

  clear() {
    this.zoomService.resetZoom();
    this.stackLayouter.clear();
    this.heapLayouter.clear();
    this.consoleLayouter.clear();
    this.heapViewIdMap = new Map();
    this.stackViewIdMap = new Map();
    this.previousStep = null;
  }

  renderStep(step: Step) {
    // stop tracking heap views and frame views which existed in the previous step
    // but do not exist in this step
    if (this.previousStep !== null) {
      const heapDiff = diffHeap(this.previousStep, step);
      heapDiff.destroyed.forEach(id => this.heapViewIdMap.delete(id));

      const stackDiff = diffStack(this.previousStep, step);
      stackDiff.destroyed.forEach(id => this.stackViewIdMap.delete(id));
    }

    // create new heap and frame views if needed
    step.stack_frames.forEach(frame =>
      this.maybeCreateFrameView(frame.frame_id, frame)
    );
    Object.keys(step.heap).forEach(id =>
      this.maybeCreateHeapElementView(id, step.heap[id])
    );

    // patch heap views so that dragging works as expected even
    // if the scene is zoomed
    for (const view of this.heapViewIdMap.values()) {
      this.zoomService.patchViewForZoom(view);
    }

    // patch heap views to keep track of their positions
    // if they are dragged by the user
    for (const view of this.heapViewIdMap.values()) {
      this.dragTracker.trackDrag(view);
    }

    // rerender the stack (code view + frame view)
    this.stackLayouter.rerender(step.stack_frames, this.stackViewIdMap);

    const fixedViews: HeapElementView[] = [];

    // reset the position of heap views which the user has dragged
    for (const view of this.heapViewIdMap.values()) {
      if (this.dragTracker.hasTrackedPosition(view)) {
        this.dragTracker.moveToTrackedPosition(view);
        fixedViews.push(view);
      }
    }

    // rerender the heap views (including connections)
    const onlyStackFrameMap = new Map(
      Array.from(this.stackViewIdMap.entries()).map(
        ([id, [stackFrameView, codeAreaView]]) => [id, stackFrameView]
      )
    );
    this.heapLayouter.rerender(
      step,
      this.heapViewIdMap,
      onlyStackFrameMap,
      fixedViews
    );

    // rerender the console
    this.consoleLayouter.rerender(step.stdout, step.exception_message);

    this.previousStep = step;
  }

  private maybeCreateHeapElementView(id: HeapElementId, element: HeapElement) {
    const viewOrUndefined = this.heapViewIdMap.get(id);
    if (viewOrUndefined) return viewOrUndefined;

    let view: HeapElementView;
    switch (element.kind) {
      case "array":
        view = createShallowArrayView(element);
        break;

      case "function":
        view = createHeapFunctionView(element.code);
        break;

      case "object":
        view = createShallowObjectView(element);
        break;

      default:
        element satisfies never;
        throw new Error("getView: heap element has unknown kind");
    }

    this.heapViewIdMap.set(id, view);
    return view;
  }

  private maybeCreateFrameView(
    id: StackFrameId,
    frame: StackFrame
  ): [StackFrameView, CodeAreaView] {
    const viewsOrUndefined = this.stackViewIdMap.get(id);
    if (viewsOrUndefined) return viewsOrUndefined;

    const stackFrameView = createShallowStackFrameView(frame);
    const codeAreaView = createCodeAreaView(
      frame.function_code,
      frame.code_line_start,
      frame.code_col_start,
      frame.code_line_end,
      frame.code_col_end
    );

    const result: [StackFrameView, CodeAreaView] = [
      stackFrameView,
      codeAreaView
    ];
    this.stackViewIdMap.set(id, result);
    return result;
  }
}
