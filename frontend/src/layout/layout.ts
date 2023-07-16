import { BrowserJsPlumbInstance } from "@jsplumb/browser-ui";
import type { Connection, ConnectionRouter, ContextLayouter } from "./types";

import type {
  HeapElementId,
  PointerValue,
  StackFrameId,
  Step,
  Value
} from "../trace/types";

import type {
  AnchorView,
  CodeAreaView,
  HeapElementView,
  StackFrameView,
  View
} from "../view/types";

import { diffConnections } from "../diff/diff";

function isPointer(value: Value): value is PointerValue {
  return value.kind === "pointer";
}

export function calculateHeapRows(
  step: Step,
  previousLayoutRows: HeapElementId[]
): HeapElementId[] {
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
        ((_: never): never => {
          throw new Error("Unhandled switch case");
        })(element);
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

function buildPointer2View(
  step: Step,
  heapId2View: Map<string, HeapElementView>,
  frameId2FrameView: Map<number, StackFrameView>
): Map<PointerValue, AnchorView> {
  const pointer2View: Map<PointerValue, AnchorView> = new Map();

  for (const id of Object.keys(step.heap)) {
    const elem = step.heap[id];
    const view = heapId2View.get(id)!;

    if (elem.kind === "array") {
      elem.values.forEach(
        (x, i) =>
          x.kind === "pointer" && pointer2View.set(x, view.getAnchorOut(i))
      );
    } else if (elem.kind === "object") {
      elem.entries.forEach(
        x =>
          x.value.kind === "pointer" &&
          pointer2View.set(x.value, view.getAnchorOut(x.key))
      );
    }
  }

  step.stack_frames.forEach(frame => {
    const frameView = frameId2FrameView.get(frame.frame_id)!;

    for (const identifier of Object.keys(frame.locals)) {
      const value = frame.locals[identifier];

      if (value.kind !== "pointer") {
        continue;
      }

      pointer2View.set(value, frameView.getAnchorOut(identifier));
    }

    // fix: stack frame may have a return value
    if (
      frame.return_value !== undefined &&
      frame.return_value.kind === "pointer"
    ) {
      pointer2View.set(
        frame.return_value,
        frameView.getAnchorOut("Return Value") // TODO: fix magic string (must be the same as view.ts)
      );
    }
  });

  return pointer2View;
}

export function calculateConnections(
  step: Step,
  heapId2View: Map<HeapElementId, HeapElementView>,
  frameId2FrameView: Map<StackFrameId, StackFrameView>
): Connection[] {
  const edges: Connection[] = [];

  const visitedIDs = new Set<HeapElementId>();

  const pointer2View = buildPointer2View(step, heapId2View, frameId2FrameView);

  // pre-order visit
  function recurse(pointer: PointerValue): void {
    const element = step.heap[pointer.ref];

    edges.push({
      source: pointer2View.get(pointer)?.parent()!,
      sourceOut: pointer2View.get(pointer)!,
      target: heapId2View.get(element.id)!,
      targetIn: heapId2View.get(element.id)?.getAnchorIn()!
    });

    if (visitedIDs.has(element.id)) {
      return; // avoid cycles
    }

    visitedIDs.add(element.id);

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
        ((_: never): never => {
          throw new Error("Unhandled switch case");
        })(element);
    }
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

  return edges;
}

/**
 * @returns Coordinates relative to the top-left element in the heap
 */
export function calculateHeapCoordinates(
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

/**
 * Reference for the layout idea: https://jsfiddle.net/k2artshw/
 */
class ContextLayouterImplementation implements ContextLayouter {
  private _insertionPoint: HTMLElement;
  private _insertionPointList: HTMLElement[] = [];
  private _frameIdList: StackFrameId[] = [];

  constructor(container: HTMLElement) {
    this._insertionPoint = container;
  }

  private push(
    stackFrameId: StackFrameId,
    codeAreaView: View,
    stackFrameView: View
  ): void {
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
    this._frameIdList.push(stackFrameId);
  }

  private pop(): void {
    const previousInsertionPoint = this._insertionPointList.pop();

    if (previousInsertionPoint === undefined) {
      throw new Error("tried to pop from an empty context stack");
    }

    previousInsertionPoint.removeChild(previousInsertionPoint.lastChild!);
    this._insertionPoint = previousInsertionPoint;
    this._frameIdList.pop();
  }

  rerender(
    frameIdList: StackFrameId[],
    id2CodeAreaView: Map<StackFrameId, CodeAreaView>,
    id2StackFrameView: Map<StackFrameId, StackFrameView>
  ): void {
    const currentSize = this._frameIdList.length;
    const newSize = frameIdList.length;

    let diffIndex = 0;
    while (
      this._frameIdList[diffIndex] === frameIdList[diffIndex] &&
      diffIndex < Math.min(currentSize, newSize)
    ) {
      diffIndex++;
    }

    while (diffIndex < this._frameIdList.length) {
      this.pop();
    }

    while (this._frameIdList.length < newSize) {
      const id = frameIdList[diffIndex];
      this.push(id, id2CodeAreaView.get(id)!, id2StackFrameView.get(id)!);
      diffIndex++;
    }
  }
}

export function createContextLayouter(container: HTMLElement | null) {
  if (container === null) {
    throw new Error("container cannot be null");
  }

  return new ContextLayouterImplementation(container);
}

class ConnectionRouterImplementation implements ConnectionRouter {
  #currConnections: Connection[] = [];
  #jsplumb: BrowserJsPlumbInstance;
  #managedViews: Set<HeapElementView> = new Set();

  constructor(jsplumb: BrowserJsPlumbInstance) {
    this.#jsplumb = jsplumb;
  }

  rerender(connections: Connection[]): void {
    connections.forEach(connection => {
      for (const view of [connection.source, connection.target]) {
        if (view.is("heap element") && !this.#managedViews.has(view)) {
          // TODO: the connection router will keep a reference to all previously-added
          // views, even those which no longer are in the page
          this.#managedViews.add(view);
          view.onDragged(() => this.#jsplumb.repaint(view.node()));
        }
      }
    });

    const { destroyed, created, updated } = diffConnections(
      this.#currConnections,
      connections
    );

    function assertArray<T, U>(x: T[] | U): T[] {
      return x as T[];
    }

    destroyed.forEach(({ sourceOut, targetIn }) => {
      assertArray(
        this.#jsplumb.getConnections({
          source: sourceOut.node(),
          target: targetIn.node()
        })
      ).forEach(connection => this.#jsplumb.deleteConnection(connection));
    });

    updated.forEach(({ sourceOut, targetIn }) => {
      assertArray(
        this.#jsplumb.getConnections({
          source: sourceOut.node(),
          target: this.#currConnections
            .find(x => x.sourceOut === sourceOut)
            ?.targetIn.node()
        })
      ).forEach(connection => (connection.target = targetIn.node()));
    });

    created.forEach(({ sourceOut, targetIn }) => {
      this.#jsplumb.connect({
        source: sourceOut.node(),
        target: targetIn.node(),
        overlays: [
          {
            type: "PlainArrow",
            options: { location: 1, width: 10, length: 10 }
          }
        ]
      });
    });

    // fix: to account for undetected changes in view position
    // (like when a new stack frame pushes views around), repaint
    // everything
    this.#jsplumb.repaintEverything();

    this.#currConnections = connections;
  }
}

export function createConnectionRouter(jsplumb: BrowserJsPlumbInstance) {
  return new ConnectionRouterImplementation(jsplumb);
}
