import type { Connection } from "../connection/types";
import { isPointer } from "../../trace";
import type {
  HeapElementId,
  PointerValue,
  StackFrameId,
  Step
} from "../../trace/types";
import type { HeapElementView, StackFrameView, View } from "../view/types";
import { setDifference } from "../../utils";
import type { ConnectionRouter } from "../connection";

import { calculateConnections } from "../connection";

export class HeapLayouter {
  private previousRenderedViews: Set<HeapElementView> = new Set();

  constructor(
    private heapContainer: HTMLElement,
    private connectionRouter: ConnectionRouter
  ) {}

  clear() {
    // remove all views from the DOM
    this.previousRenderedViews.forEach(view => view.node().remove());
    this.previousRenderedViews = new Set();
    // clear connection arrows
    this.connectionRouter.clear();
  }

  rerender(
    step: Step,
    heapViewsIdMap: Map<HeapElementId, HeapElementView>,
    frameViewsIdMap: Map<StackFrameId, StackFrameView>,
    fixedViews: HeapElementView[]
  ) {
    // put new heap views in the DOM
    Object.entries(step.heap).forEach(([id, _]) =>
      this.heapContainer.appendChild(heapViewsIdMap.get(id)?.node()!)
    );

    // get the fixed position of the fixed views
    const fixedPositions = new Map(
      fixedViews.map(view => [view, [view.x(), view.y()]])
    );

    // rerender the content of each heap view
    Object.entries(step.heap).forEach(([id, element]) =>
      heapViewsIdMap.get(id)?.rerender(element)
    );

    // calculate the vertical position of the heap elements
    const heapRows = calculateHeapRows(step);

    const orderedViews = heapRows.map(id => heapViewsIdMap.get(id)!);

    // calculate connection arrows between views
    const connections = calculateConnections(
      step,
      heapViewsIdMap,
      frameViewsIdMap
    );

    // calculate horizontal+vertical coordinates
    const heapCoordinates = calculateHeapCoordinates(
      orderedViews,
      connections,
      20,
      20
    );

    // set positions based on either the calculated coordinates,
    // or the fixed position set by the client
    for (const view of orderedViews) {
      const [x, y] = fixedPositions.has(view)
        ? fixedPositions.get(view)!
        : heapCoordinates.get(view)!;

      view.x(x);
      view.y(y);
    }

    this.connectionRouter.rerender(connections);

    // remove previous heap views from the DOM
    const currentViews: Set<HeapElementView> = new Set(orderedViews);
    for (const previousView of setDifference(
      this.previousRenderedViews,
      currentViews
    )) {
      previousView.node().remove();
    }
    this.previousRenderedViews = currentViews;
  }
}

/**
 *
 * @returns Ordered list of heap element ids, indicating that
 * they should be positioned top-to-bottom in order
 */
function calculateHeapRows(step: Step): HeapElementId[] {
  // TODO check what pythontutor does with previous step rows
  // const rows = previousLayoutRows.slice(0); // copy
  const rows: HeapElementId[] = [];
  const currentStepIDs = new Set<HeapElementId>();

  // post-order visit
  function recurse(pointer: PointerValue): void {
    const element = step.heap[pointer.ref];

    if (currentStepIDs.has(element.id)) {
      return; // avoid cycles
    }

    currentStepIDs.add(element.id);

    switch (element.kind) {
      case "array":
        element.values.filter(isPointer).forEach(recurse);
        break;
      case "object":
        element.entries
          .map(({ value }) => value)
          .filter(isPointer)
          .forEach(recurse);
        break;
      case "function":
        break;
      default:
        element satisfies never;
        break;
    }

    rows.push(element.id);
  }

  // recurse on global and frame-local pointer variables

  step.stack_frames.forEach(frame => {
    frame.ordered_locals
      .map(name => frame.locals[name])
      .filter(isPointer)
      .forEach(recurse);
  });

  // fix: stack frame may have a return value
  const activeStackFrame = step.stack_frames.slice(-1)[0];
  if (
    activeStackFrame !== undefined &&
    activeStackFrame.return_value?.kind === "pointer"
  ) {
    recurse(activeStackFrame.return_value);
  }

  // remove IDs from the previous step that are no longer present in this step
  return rows.filter(id => currentStepIDs.has(id));
}

/**
 * @returns Coordinates relative to the top-left element in the heap
 */
function calculateHeapCoordinates(
  heapRows: View[],
  edges: Connection[],
  verticalMargin: number,
  horizontalMargin: number
): Map<View, [number, number]> {
  const coordinates: Map<View, [number, number]> = new Map(
    heapRows.map(x => [x, [0, 0]])
  );

  // calculate y coordinates
  for (let i = 1; i < heapRows.length; i++) {
    const view = heapRows[i];
    const prevView = heapRows[i - 1];
    coordinates.get(view)![1] =
      coordinates.get(prevView)![1] + prevView.height() + verticalMargin;
  }

  /**
   * x-coordinates are calculated below to minimize the number of right-to-left edges.
   * We use a heuristic (slightly changed from that of pythontutor), but the exact
   * problem is the "minimum feedback arc set" problem. See:
   * https://en.wikipedia.org/wiki/Feedback_arc_set
   */

  // to avoid cycles
  const offsetParents: Map<View, Set<View>> = new Map(
    heapRows.map(x => [x, new Set()])
  );

  function recurse(view: View) {
    edges
      .filter(({ source }) => source === view)
      .forEach(({ source, sourceOut, target }) => {
        // avoid self-references
        if (source === target) return;

        // avoid back-edges (cycles)
        if (offsetParents.get(source)!.has(target)) return;

        // parents[target] = source + parents[source]
        offsetParents.get(target)?.add(source);
        offsetParents
          .get(source)
          ?.forEach(x => offsetParents.get(target)?.add(x));

        coordinates.get(target)![0] = Math.max(
          coordinates.get(target)![0],
          coordinates.get(source)![0] +
            sourceOut.offsetLeft() +
            horizontalMargin
        );

        recurse(target);
      });
  }

  // calculate x coordinates
  for (let i = 1; i < heapRows.length; i++) {
    const view = heapRows[i];
    recurse(view);
  }

  return coordinates;
}
