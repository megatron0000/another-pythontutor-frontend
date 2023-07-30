import type { Stdout } from "../../trace/types";
import { JSFrame } from "jsframe.js";
import * as d3 from "d3";

export function createConsoleLayouter(container: HTMLElement) {
  const jsFrame = new JSFrame();

  // heuristic: initial position of the console window
  // based on the size of the viewport
  const position =
    window.innerWidth >= 700
      ? { top: 60, left: window.innerWidth - 330 }
      : { top: window.innerHeight - 90, left: 10 };

  const frame = jsFrame
    .create({
      // does not work because the jsframe lib has a bug
      // parentElement: container,
      title: "Console",
      appearanceName: "material",
      appearanceParam: {
        border: {
          shadow: "rgba(0, 0, 0, 0.8) 0px 5px 15px"
        },
        titleBar: {
          color: "white",
          background: "#4784d4",
          leftMargin: 10,
          height: 30,
          fontSize: 13.333,
          buttonWidth: 36,
          buttonHeight: 16,
          buttonColor: "white",
          buttons: []
        }
      },
      style: {
        overflow: "auto"
      },
      width: 320,
      height: 80,
      ...position,
      html: `
        <div class="console-content-container"></div>
      `
    })
    .show();

  // frame.htmlElement.style.overflow = "hidden";

  frame.setControl({
    minimizeButton: "minimizeButton",
    deminimizeButton: "deminimizeButton",
    animation: true,
    animationDuration: 100
  });

  /**
   * Fixes are no longer necessary becaused I turned off the buttons (no buttons anymore...)
   */
  // fix: jsframelib has a bug where the `on` method assigns
  // the callback function as a listener named "frame-component-listener".
  // But there may be only 1 listener with such a name (and the lib comes
  // with a default listener). So we remove the default listener before
  // inserting our own listener
  // frame.eventListenerHelper.clearEventListener(
  //   frame.getFrameComponentElement("minimizeButton"),
  //   "click",
  //   "frame-component-listener"
  // );
  // frame.on("minimizeButton", "click", (_frame, evt) => {
  //   _frame.control.doMinimize();
  // });

  // frame.eventListenerHelper.clearEventListener(
  //   frame.getFrameComponentElement("deminimizeButton"),
  //   "click",
  //   "frame-component-listener"
  // );
  // frame.on("deminimizeButton", "click", (_frame, evt) => {
  //   _frame.control.doDeminimize();
  // });

  // fix: the `parentElement` option does not work (library bug!) so
  // we hack away, using an internal property ".parentCanvas.parentElement"
  // to capture the element and put it under the intended container
  container.appendChild(frame.parentCanvas.parentElement);

  /**
   * Not needed anymore because we do not allow minimizing the console window
   */
  // // fix: jsframe lib has a bug where the content of the window
  // // does not minimize when the window minimized. This
  // // fixes the issue, although it is a hack
  // document.querySelector(".console-content-container")!.parentElement!.style.overflow =
  //   "hidden";

  const contentArea = d3.select<HTMLElement, unknown>(
    ".console-content-container"
  );

  // fix: avoid that the console window goes to outside
  // the viewport when the window resizes
  window.addEventListener("resize", () => {
    const { pos, size } = frame._getCurrentSizePos();
    const newPos = { ...pos };
    if (pos.x < 0) newPos.x = 0;
    if (pos.x >= window.innerWidth) newPos.x = window.innerWidth - size.width;
    if (pos.y <= 60) newPos.y = 60;
    if (pos.y >= window.innerHeight)
      newPos.y = window.innerHeight - size.height;
    frame.setPosition(newPos.x, newPos.y);
  });

  return {
    rerender(stdout: Stdout, stderr?: string) {
      const updateSelection = contentArea
        .selectAll<HTMLDivElement, Stdout[number]>(
          "div.console__line:not(.error)"
        )
        .data(stdout);

      updateSelection.exit().remove();
      // remove and recreate because it is easier this way
      updateSelection.html(null); // https://stackoverflow.com/questions/14422198/how-do-i-remove-all-children-elements-from-a-node-and-then-apply-them-again-with/43661877#43661877

      const allSelection = updateSelection
        .enter()
        .append("div")
        .classed("console__line", true)
        .merge(updateSelection);

      allSelection
        .append("div")
        .classed("console__line__content", true)
        .text(datum => datum.content);

      allSelection
        .append("div")
        .classed("console__line__linenumber", true)
        .text(datum => `:${datum.line}`);

      const errorAllSelection = contentArea
        .selectAll<HTMLDivElement, string>("div.console__line.error")
        .data(stderr === undefined ? [] : [stderr]);

      errorAllSelection.exit().remove();

      const errorUpdateSelection = errorAllSelection
        .enter()
        .append("div")
        .classed("console__line error", true)
        .merge(errorAllSelection);

      errorUpdateSelection
        .append("div")
        .classed("console__line__content", true)
        .text(datum => datum);

      errorUpdateSelection
        .append("div")
        .classed("console__line__linenumber", true);
    },

    clear() {
      container.innerHTML = "";
    }
  };
}
