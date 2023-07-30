import type { HeapElementView } from "../renderers/view/types";

export class DragTracker {
  private managedViews: WeakSet<HeapElementView> = new WeakSet();
  private positions: WeakMap<HeapElementView, [number, number]> = new WeakMap();

  trackDrag(view: HeapElementView) {
    if (this.managedViews.has(view)) return;
    this.managedViews.add(view);

    view.onDragged(({ x, y }) => this.positions.set(view, [x, y]));
  }

  hasTrackedPosition(view: HeapElementView) {
    return this.positions.has(view);
  }

  moveToTrackedPosition(view: HeapElementView) {
    if (!this.hasTrackedPosition(view)) {
      throw new Error(
        "getTrackedPosition: view does not have tracked position"
      );
    }

    const [x, y] = this.positions.get(view)!;
    view.x(x);
    view.y(y);
  }
}
