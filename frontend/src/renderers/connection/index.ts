import type { BrowserJsPlumbInstance } from "@jsplumb/browser-ui";
import { diffConnections } from "../../diff";
import { isPointer } from "../../trace";
import type {
  HeapElementId,
  PointerValue,
  StackFrameId,
  Step
} from "../../trace/types";
import type {
  AnchorView,
  HeapElementView,
  StackFrameView
} from "../view/types";
import type { Connection } from "./types";
import { assertArray } from "../../utils";

export class ConnectionRouter {
  private currConnections: Connection[] = [];
  // WeakSet so that the ConnectionRouter may release the View when it is no longer
  // being used elsewhere (since we only need to store these views here because
  // it is the only way to avoid using `onDragged` twice on the same view)
  private managedViews: WeakSet<HeapElementView> = new WeakSet();

  constructor(private jsplumb: BrowserJsPlumbInstance) {}

  clear() {
    // destroy all connections
    this.currConnections.forEach(({ sourceOut, targetIn }) => {
      assertArray(
        this.jsplumb.getConnections({
          source: sourceOut.node(),
          target: targetIn.node()
        })
      ).forEach(connection => this.jsplumb.deleteConnection(connection));
    });

    this.currConnections = [];
    this.managedViews = new WeakSet();
  }

  rerender(connections: Connection[]): void {
    connections.forEach(connection => {
      for (const view of [connection.source, connection.target]) {
        if (view.is("heap element") && !this.managedViews.has(view)) {
          this.managedViews.add(view);
          view.onDragged(() => this.jsplumb.repaint(view.node()));
        }
      }
    });

    const { destroyed, created, updated } = diffConnections(
      this.currConnections,
      connections
    );

    destroyed.forEach(({ sourceOut, targetIn }) => {
      assertArray(
        this.jsplumb.getConnections({
          source: sourceOut.node(),
          target: targetIn.node()
        })
      ).forEach(connection => this.jsplumb.deleteConnection(connection));
    });

    updated.forEach(({ sourceOut, targetIn }) => {
      assertArray(
        this.jsplumb.getConnections({
          source: sourceOut.node(),
          target: this.currConnections
            .find(x => x.sourceOut === sourceOut)
            ?.targetIn.node()
        })
      ).forEach(connection => (connection.target = targetIn.node()));
    });

    created.forEach(({ sourceOut, targetIn }) => {
      this.jsplumb.connect({
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
    this.jsplumb.repaintEverything();

    this.currConnections = connections;
  }
}

export function calculateConnections(
  step: Step,
  heapViewsIdMap: Map<HeapElementId, HeapElementView>,
  frameViewsIdMap: Map<StackFrameId, StackFrameView>
): Connection[] {
  const edges: Connection[] = [];

  const visitedIDs = new Set<HeapElementId>();

  const pointer2View = buildViewsPointerMap(
    step,
    heapViewsIdMap,
    frameViewsIdMap
  );

  // pre-order visit
  function recurse(pointer: PointerValue): void {
    const element = step.heap[pointer.ref];

    edges.push({
      source: pointer2View.get(pointer)?.parent()!,
      sourceOut: pointer2View.get(pointer)!,
      target: heapViewsIdMap.get(element.id)!,
      targetIn: heapViewsIdMap.get(element.id)?.getAnchorIn()!
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
        element satisfies never;
        break;
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

function buildViewsPointerMap(
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
        frameView.getAnchorOut("return ") // TODO: fix magic string (must be the same as view.ts)
      );
    }
  });

  return pointer2View;
}
