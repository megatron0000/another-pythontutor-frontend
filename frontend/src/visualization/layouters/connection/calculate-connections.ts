import { isPointer } from "../../../code/trace";
import type {
  HeapElementId,
  PointerValue,
  StackFrameId,
  Step
} from "../../../code/trace/types";
import type { HeapElementView, StackFrameView } from "../../view-module/types";
import type { Connection } from "./types";
import { buildViewsPointerMap } from "./connection-layouter";

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
