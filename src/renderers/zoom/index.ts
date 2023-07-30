import * as d3 from "d3";
import type { HeapElementView } from "../view/types";

export class ZoomService {
  private patchedViews: WeakSet<HeapElementView> = new WeakSet();

  constructor(
    private zoomContainer: HTMLElement,
    private visualizerContainer: HTMLElement
  ) {}

  enableMouseZooming() {
    // zoom and drag the scene
    // https://stackoverflow.com/questions/43903487/how-to-apply-d3-zoom-to-a-html-element
    d3.select<HTMLElement, unknown>(this.zoomContainer).call(
      d3.zoom<HTMLElement, unknown>().on("zoom", event => {
        const transform = event.transform;
        this.visualizerContainer.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`;
        this.visualizerContainer.style.transformOrigin = "0 0";
      })
    );
  }

  resetZoom() {
    this.visualizerContainer.style.transform = "";
  }

  patchViewForZoom(view: HeapElementView) {
    if (this.patchedViews.has(view)) return;
    this.patchedViews.add(view);

    // account for page zoom because internal draggable behaviour is "not aware"
    // of scaling on the page
    view.onWillDrag(delta => {
      // based on:
      // https://stackoverflow.com/questions/45121905/read-css-scale-value-using-js-or-jquery?noredirect=1&lq=1
      const scale = parseFloat(
        this.visualizerContainer.style.transform.match(
          /scale\(([^)]+)\)/
        )?.[1] || "1"
      );
      delta.dx *= 1 / scale;
      delta.dy *= 1 / scale;
    });
  }
}
