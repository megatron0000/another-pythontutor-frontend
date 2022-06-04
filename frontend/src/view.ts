/**
 * TODO: refactor rerender() logic for arrays and stack frame (to avoid deleting the anchor_out if
 * the change is merely an update to the pointer reference)
 */

/**
 * Structure of this file:
 *  1. Functions named "create**View" create `View` instances (see view.d.ts) using lower-level factories
 *  2. Functions named "**_factory" create methods which can be used to build `View`s.
 */

type D3 = typeof import("d3");
type AceNamespace = typeof import("../types/vendor/ace");
import { Ace } from "../types/vendor/ace";

import {
  HeapArray,
  HeapObject,
  Identifier,
  ObjectEntry,
  StackFrame,
  Value
} from "../types/trace";
import ViewModule, {
  CodeAreaView,
  StackFrameView,
  AnchorView,
  HeapElementView,
  View
} from "../types/view";

define(["d3/d3.v7", "ace/ace"], function (
  d3: D3,
  ace: AceNamespace
): ViewModule {
  ace.config.set(
    "basePath",
    "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.14"
  );

  function createShallowArrayView(arrayData: HeapArray): HeapElementView {
    const key2anchorOut: Map<number, HTMLElement> = new Map();

    const heapElementContainer = d3
      .create("div")
      .classed("heap__element__container", true);

    const heapElement = heapElementContainer
      .append("div")
      .classed("heap__element array", true);
    // .classed("heap__element array grid", true);

    const anchorIn = heapElement.append("div").classed("anchor__in", true);

    heapElement
      .append("div")
      .classed("heap__element__typeLabel", true)
      .text("array");

    // if (arrayData.values.length > 0) {
    //   heapElement.append("div").classed("filling grid__row2", true);
    // }

    const arrayTable = heapElement
      .append("table")
      .classed("heap__element__array", true);
    // .classed("heap__element__array grid__col2 grid__row2", true);

    const indexRow = arrayTable.append("tr");

    const valueRow = arrayTable.append("tr");

    indexRow
      .selectAll("td")
      .data(arrayData.values.map((_, i) => i))
      .enter()
      .append("td")
      .classed("heap__element__array_index", true)
      .text(datum => datum);

    const valueContainer = valueRow
      .selectAll("td")
      .data(arrayData.values)
      .enter()
      .append("td")
      .classed("heap__element__array__value", true);

    valueContainer
      .filter(datum => datum.kind === "pointer")
      .append("div")
      .classed("anchor__out", true)
      .each(function (datum) {
        key2anchorOut.set(arrayData.values.indexOf(datum), this);
      });

    valueContainer.append(datum => createValueNode(datum).node());

    const view = createHeapElementView(
      heapElementContainer.node(),
      anchorIn.node(),
      key2anchorOut
    );

    view.rerender = function rerender(newData: HeapArray | HeapObject) {
      if (newData.kind === "object") {
        throw new Error("tried to rerender an array with object data");
      }

      const newIndexRow = indexRow
        .selectAll("td")
        .data(newData.values.map((_, i) => i));
      newIndexRow.exit().remove();
      newIndexRow.text(datum => datum);
      newIndexRow
        .enter()
        .append("td")
        .classed("heap__element__array_index", true)
        .text(datum => datum);

      key2anchorOut.clear();

      const updatedValueContainer = valueRow
        .selectAll<HTMLTableCellElement, unknown>("td")
        .data(newData.values);

      updatedValueContainer.exit().remove();
      updatedValueContainer.html(null); // https://stackoverflow.com/questions/14422198/how-do-i-remove-all-children-elements-from-a-node-and-then-apply-them-again-with/43661877#43661877

      const newValueContainer = updatedValueContainer
        .enter()
        .append("td")
        .classed("heap__element__array__value", true)
        .merge(updatedValueContainer); // https://stackoverflow.com/questions/48178618/d3-v4-merge-enter-and-update-selections-to-remove-duplicate-code

      newValueContainer
        .filter(datum => datum.kind === "pointer")
        .append("div")
        .classed("anchor__out", true)
        .each(function (datum) {
          key2anchorOut.set(newData.values.indexOf(datum), this);
        });

      newValueContainer.append(datum => createValueNode(datum).node());

      // invoke the factory again because it creates new AnchorView instances
      view.getAnchorOut = getAnchorOut_factory(
        view,
        view.node(),
        key2anchorOut
      ).getAnchorOut;
    };

    return view;
  }

  function createShallowObjectView(objectData: HeapObject): HeapElementView {
    const key2anchorOut: Map<string, HTMLElement> = new Map();

    const heapElementContainer = d3
      .create("div")
      .classed("heap__element__container", true);

    const heapElement = heapElementContainer
      .append("div")
      .classed("heap__element object", true);

    const anchorIn = heapElement.append("div").classed("anchor__in", true);

    heapElement
      .append("div")
      .classed("heap__element__typeLabel", true)
      .text("object");

    const objectTable = heapElement
      .append("table")
      .classed("heap__element__object", true);

    const objectRows = objectTable
      .selectAll<HTMLTableRowElement, ObjectEntry>("tr")
      .data(objectData.entries, (datum: ObjectEntry) => datum.key)
      .enter()
      .append("tr");

    objectRows
      .append("td")
      .classed("heap__element__object__key", true)
      .text(datum => datum.key);

    const valueContainer = objectRows
      .append("td")
      .classed("heap__element__object__value", true);

    valueContainer
      .filter(datum => datum.value.kind === "pointer")
      .append("div")
      .classed("anchor__out", true)
      .each(function (datum) {
        key2anchorOut.set(datum.key, this);
      });

    valueContainer.append(datum => createValueNode(datum.value).node());

    const view = createHeapElementView(
      heapElementContainer.node(),
      anchorIn.node(),
      key2anchorOut
    );

    view.rerender = function rerender(newData: HeapObject | HeapArray) {
      if (newData.kind === "array") {
        throw new Error("tried to rerender an object with array data");
      }

      // https://stackoverflow.com/questions/23409250/compare-diff-new-data-with-previous-data-on-d3-js-update
      const previousData = d3.local<ObjectEntry>();

      key2anchorOut.clear();

      const updatedObjectRows = objectTable
        .selectAll<HTMLTableRowElement, ObjectEntry>("tr")
        .data(newData.entries, (datum: ObjectEntry) => datum.key)
        .filter(function (datum) {
          // filter out old pointers that still are pointers (to avoid deleting the anchor_out)
          if (
            previousData.get(this)?.value.kind === "pointer" &&
            datum.value.kind === "pointer"
          ) {
            return false;
          }
          return true;
        });

      updatedObjectRows.exit().remove();
      updatedObjectRows.html(null); // https://stackoverflow.com/questions/14422198/how-do-i-remove-all-children-elements-from-a-node-and-then-apply-them-again-with/43661877#43661877

      const allObjectRows = updatedObjectRows
        .enter()
        .append("tr")
        .merge(updatedObjectRows); // https://stackoverflow.com/questions/48178618/d3-v4-merge-enter-and-update-selections-to-remove-duplicate-code

      allObjectRows.each(function (datum) {
        previousData.set(this, datum);
      });

      allObjectRows
        .append("td")
        .classed("heap__element__object__key", true)
        .text(datum => datum.key);

      const valueContainer = allObjectRows
        .append("td")
        .classed("heap__element__object__value", true);

      valueContainer
        .filter(datum => datum.value.kind === "pointer")
        .append("div")
        .classed("anchor__out", true)
        .each(function (datum) {
          key2anchorOut.set(datum.key, this);
        });

      valueContainer.append(datum => createValueNode(datum.value).node());

      // invoke the factory again because it creates new AnchorView instances
      view.getAnchorOut = getAnchorOut_factory(
        view,
        view.node(),
        key2anchorOut
      ).getAnchorOut;
    };

    return view;
  }

  function createHeapFunctionView(code: string): HeapElementView {
    const heapElementContainer = d3
      .create("div")
      .classed("heap__element__container", true);

    const heapElement = heapElementContainer
      .append("div")
      .classed("heap__element function", true);

    const anchorIn = heapElement.append("div").classed("anchor__in", true);

    const functionCode = heapElement
      .append("pre")
      .classed("heap__element__function", true)
      .text(code);

    const view = createHeapElementView(
      heapElementContainer.node(),
      anchorIn.node(),
      new Map()
    );

    view.rerender = function () {
      // unneeded because functions do not change
    };

    return view;
  }

  function createShallowStackFrameView(frame: StackFrame): StackFrameView {
    const key2anchorOut: Map<string, HTMLElement> = new Map();

    const frameContainer = d3
      .create("div")
      .classed("stack__frame", true)
      .classed("active", false);

    const frameHeader = frameContainer
      .append("div")
      .classed("stack__frame__header", true)
      .text(frame.function_name);

    const frameBody = frameContainer
      .append("table")
      .classed("stack__frame__body", true);

    const frameTrCollection = frameBody
      .selectAll<HTMLTableRowElement, Identifier>("tr")
      .data(frame.ordered_locals)
      .enter()
      .append("tr");

    frameTrCollection
      .append("td")
      .classed("stack__frame__body__variable__identifier", true)
      .text(datum => datum);

    const valueContainer = frameTrCollection
      .append("td")
      .classed("stack__frame__body__variable__value", true);

    valueContainer
      .filter(datum => frame.locals[datum].kind === "pointer")
      .append("div")
      .classed("anchor__out", true)
      .each(function (datum) {
        key2anchorOut.set(datum, this);
      });

    valueContainer.append(datum => createValueNode(frame.locals[datum]).node());

    const view: StackFrameView = {
      ...nodeWidthHeight_factory(frameContainer.node()),
      setActive(active: boolean) {
        frameContainer.classed("active", active);
      },
      getAnchorOut(key) {
        throw new Error("not implemented");
      },
      rerender(newData: StackFrame) {
        throw new Error("not implemented");
      },
      is(kind) {
        return kind === "stack frame";
      }
    };

    view.getAnchorOut = getAnchorOut_factory(
      view,
      frameContainer.node(),
      key2anchorOut
    ).getAnchorOut;

    view.rerender = function rerender(newData: StackFrame) {
      // hack: treat return value as if it were another local variable
      const RETURN_VALUE_NAME = "Return Value";

      const newDataIdentifiers = newData.ordered_locals.concat(
        newData.return_value !== undefined ? RETURN_VALUE_NAME : []
      );

      const newDataLocals: Record<string, Value> = {
        ...newData.locals,
        ...(newData.return_value !== undefined
          ? { [RETURN_VALUE_NAME]: newData.return_value }
          : {})
      };

      const updatedFrameTrCollection = frameBody
        .selectAll<HTMLTableRowElement, Identifier>("tr")
        .data(newDataIdentifiers);

      updatedFrameTrCollection.exit().remove();
      updatedFrameTrCollection.html(null);

      key2anchorOut.clear();

      const newFrameTrCollection = updatedFrameTrCollection
        .enter()
        .append("tr")
        .merge(updatedFrameTrCollection);

      newFrameTrCollection
        .append("td")
        .classed("stack__frame__body__variable__identifier", true)
        .classed(
          "return_value_identifier",
          datum => datum === RETURN_VALUE_NAME
        )
        .text(datum => datum);

      const valueContainer = newFrameTrCollection
        .append("td")
        .classed("stack__frame__body__variable__value", true);

      valueContainer
        .filter(datum => newDataLocals[datum].kind === "pointer")
        .append("div")
        .classed("anchor__out", true)
        .each(function (datum) {
          key2anchorOut.set(datum, this);
        });

      valueContainer.append(datum =>
        createValueNode(newDataLocals[datum]).node()
      );

      // invoke the factory again because it creates new AnchorView instances
      view.getAnchorOut = getAnchorOut_factory(
        view,
        frameContainer.node(),
        key2anchorOut
      ).getAnchorOut;
    };

    return view;
  }

  function createCodeAreaView(
    code: string,
    firstLineNumber: number
  ): CodeAreaView {
    const container = d3
      .create("div")
      .attr("class", "code__area")
      // disable mouse interaction: https://github.com/ajaxorg/ace/issues/266
      .style("pointer-events", "none");

    const node = container.node();

    if (node === null) {
      throw new Error("node cannot be null");
    }

    const codeAreaController = new CodeAreaController(
      node,
      code,
      firstLineNumber
    );

    return {
      ...nodeWidthHeight_factory(container.node()),
      highlightCurrentLine(lineNumber: number) {
        codeAreaController.highlightCurrentLine(lineNumber);
      },
      highlightPreviousLine(lineNumber: number) {
        codeAreaController.highlightPreviousLine(lineNumber);
      },
      is(kind) {
        return kind === "code area";
      }
    };
  }

  class CodeAreaController {
    private _editor: Ace.Editor | null = null;
    private _firstLineNumber: number;
    private _code: string;
    private _node: HTMLElement;
    private _prevLineSVG = (() => {
      // https://stackoverflow.com/questions/20873490/how-to-make-d3-js-generate-an-svg-without-drawing-it
      const svg = d3.select("body").append("svg");
      svg
        .attr("width", "18px")
        .attr("height", "10px")
        .style("position", "absolute")
        // Must play nice with visualization-menu and console window
        .style("z-index", "8")
        .append("polygon")
        .attr("points", "0,3 12,3 12,0 18,5 12,10 12,7 0,7")
        .attr("fill", "rgba(100, 200, 100, 0.5)");
      return svg.remove();
    })();
    private _currLineSVG = (() => {
      // https://stackoverflow.com/questions/20873490/how-to-make-d3-js-generate-an-svg-without-drawing-it
      const svg = d3.select("body").append("svg");
      svg
        .attr("width", "18px")
        .attr("height", "10px")
        .style("position", "absolute")
        // Must play nice with visualization-menu and console window
        .style("z-index", "8")
        .append("polygon")
        .attr("points", "0,3 12,3 12,0 18,5 12,10 12,7 0,7")
        .attr("fill", "rgba(100, 200, 100, 1.0)");
      return svg.remove();
    })();
    private _currentLineMarker: any = null;
    private _previousLineMarker: any = null;

    constructor(node: HTMLElement, code: string, firstLineNumber: number) {
      this._node = node;
      this._code = code;
      this._firstLineNumber = firstLineNumber;

      insertTemporarily(this._node, () => this._setupEditor());

      /**
       * not needed anymore because this._setupEditor() now temporarily
       * inserts the node inside document.body to calculate dimensions (and removes
       * it again). TODO: decide whether the editor should be destroyed when
       * it is removed from document.body
       */
      // let in_dom = false;
      // const observer = new MutationObserver(mutations => {
      //   if (this._node.isConnected) {
      //     if (!in_dom) {
      //       this._setupEditor();
      //     }
      //     in_dom = true;
      //   } else if (in_dom) {
      //     in_dom = false;
      //     this._editor?.destroy();
      //     // console.log(
      //     //   "destroyed ace editor after the DOM node was removed from the page"
      //     // );
      //     observer.disconnect();
      //   }
      // });
      // observer.observe(document.body, { subtree: true, childList: true });
    }

    /**
     * if the DOM node is not inside the page, connects it
     * for a brief moment and then disconnects again
     * (otherwise the Ace editor does not resize properly)
     */
    private _setupEditor() {
      // See https://codepen.io/zymawy/pen/XwbxoJ
      // for an explanation about all options
      this._editor = ace.edit(this._node, {
        fontSize: 14,
        theme: "ace/theme/chrome",
        mode: "ace/mode/javascript",
        firstLineNumber: this._firstLineNumber,
        readOnly: true,
        maxLines: Infinity, // trick to make container height resize with editor content,
        showFoldWidgets: false,
        highlightActiveLine: false,
        highlightSelectedWord: false,
        highlightGutterLine: false,
        animatedScroll: true
      });

      // fix: disable tooltips (otherwise they appear on mouse hover)
      this._editor.session.setUseWorker(false);

      this._editor.getSession().selection.on("changeSelection", (e: any) => {
        this._editor?.getSession().selection.clearSelection();
      });

      this._editor.setValue(this._code);

      /**
       * Tricks to make width === text width
       * https://stackoverflow.com/questions/57274039/set-width-of-ace-editor-instance-according-to-the-length-of-characters-in-it
       *
       * TODO: buggy effects on the editor if not read-only (not a problem here because it is read-only)
       */

      const renderer = this._editor.renderer;
      const session = this._editor.session;
      const { index: lineWithMostChars } = session
        .getLines(0, session.getLength())
        .map((x, i) => ({ length: x.length, index: i }))
        .reduce(
          (prev, curr) => {
            if (curr.length >= prev.length) {
              prev.length = curr.length;
              prev.index = curr.index;
            }
            return prev;
          },
          { length: 0, index: -1 }
        );
      var text = session.getLine(lineWithMostChars);
      // @ts-ignore
      var chars = session.$getStringScreenWidth(text, 80)[0];

      var width =
        // @ts-ignore
        Math.max(chars, 10) * renderer.characterWidth + // text size
        // @ts-ignore
        2 * renderer.$padding + // padding
        2 + // little extra for the cursor
        0; // add border width if needed

      // update container size
      renderer.container.style.width = width + 44 + "px";
      // update computed size stored by the editor
      // @ts-ignore
      renderer.onResize(false, 41, width, renderer.$size.height);
      this._editor.resize(true);
      // ace did not show horizontal scrollbar automatically, so check for overflow manually
      if (text.length > 80) {
        // @ts-ignore
        renderer.scrollBarH.setVisible(true);
        // https://bleepingcoder.com/ace/392616428/scrollbar-covers-last-line-in-editor
        renderer.setScrollMargin(0, 10, 0, 10);
      } else {
        // @ts-ignore
        renderer.scrollBarH.setVisible(false);
      }

      // Ace starts with all text selected (don't know why). Therefore deselect
      this._editor.clearSelection();
    }

    private highlightLine(lineNumber: number, kind: "current" | "previous") {
      const svg = kind === "current" ? this._currLineSVG : this._prevLineSVG;
      if (!svg.node()?.isConnected) {
        d3.select(this._node).append(() => svg.node());
      }
      svg
        .transition()
        .ease(d3.easeCubicOut)
        .duration(kind === "current" ? 400 : 0) // only animate the current-line arrow
        .style(
          "top",
          // 16px is the line height, and 3px was manually tested to center the arrow vertically
          `${(lineNumber - this._firstLineNumber) * 16 + 3}px`
        );

      const marker =
        kind === "current" ? this._currentLineMarker : this._previousLineMarker;
      // https://stackoverflow.com/questions/33324361/ace-editor-cant-get-rid-of-marker
      if (marker !== null) {
        this._editor?.session.removeMarker(marker);
      }
      if (lineNumber !== Math.floor(lineNumber) /** is fractional */) {
        return;
      }
      // https://stackoverflow.com/questions/27531860/how-to-highlight-a-certain-line-in-ace-editor?noredirect=1&lq=1
      const newMarker = this._editor?.session.addMarker(
        new ace.Range(lineNumber - 1, 0, lineNumber - 1, 1),
        kind === "current"
          ? "code__area__currentLine"
          : "code__area__previousLine",
        "fullLine"
      );
      if (kind === "current") {
        this._currentLineMarker = newMarker;
      } else {
        this._previousLineMarker = newMarker;
      }
    }

    private clearHighlight(kind: "current" | "previous") {
      const svg = kind === "current" ? this._currLineSVG : this._prevLineSVG;
      svg.remove();

      const marker =
        kind === "current" ? this._currentLineMarker : this._previousLineMarker;
      // https://stackoverflow.com/questions/33324361/ace-editor-cant-get-rid-of-marker
      if (marker !== null) {
        this._editor?.session.removeMarker(marker);
      }
    }

    highlightCurrentLine(lineNumber: number) {
      if (lineNumber === -1) {
        this.clearHighlight("current");
      } else {
        this.highlightLine(lineNumber, "current");
      }
    }

    highlightPreviousLine(lineNumber: number) {
      if (lineNumber === -1) {
        this.clearHighlight("previous");
      } else {
        this.highlightLine(lineNumber, "previous");
      }
    }
  }

  function createHeapElementView(
    container: HTMLElement | null,
    anchorInElement: HTMLElement | null,
    key2anchorOut: Map<string | number, HTMLElement>
  ): HeapElementView {
    if (!container) {
      throw new Error("container must not be null");
    }
    if (!anchorInElement) {
      throw new Error("anchor_in element must not be null");
    }

    const view: HeapElementView = {
      ...nodeWidthHeight_factory(container),
      x(newX?: number) {
        if (newX !== undefined) {
          // TODO: does not work because jsplumb still "sees"
          // the old position before the animation starts, and renders
          // the arrows at the wrong place
          // d3.select(this.node())
          //   .transition()
          //   .duration(200)
          //   .style("left", `${newX}px`);
          this.node().style.left = `${newX}px`;
        }

        return parseFloat(this.node().style.left) || 0;
      },
      y(newY?: number) {
        if (newY !== undefined) {
          // see above
          // d3.select(this.node())
          //   .transition()
          //   .duration(200)
          //   .style("top", `${newY}px`);
          this.node().style.top = `${newY}px`;
        }

        return parseFloat(this.node().style.top) || 0;
      },
      getAnchorOut(key) {
        throw new Error("not implemented");
      },
      getAnchorIn() {
        throw new Error("not implemented");
      },
      rerender() {
        throw new Error("not implemented");
      },
      onWillDrag(callback) {
        throw new Error("not implemented");
      },
      onDragged(callback) {
        throw new Error("not implemented");
      },
      is(kind) {
        return kind === "heap element";
      }
    };

    const { onDragged, onWillDrag } = draggableBehaviour_factory(view);

    view.onDragged = onDragged;
    view.onWillDrag = onWillDrag;

    view.getAnchorOut = getAnchorOut_factory(
      view,
      container,
      key2anchorOut
    ).getAnchorOut;

    view.getAnchorIn = getAnchorIn_factory(
      view,
      container,
      anchorInElement
    ).getAnchorIn;

    return view;
  }

  function createAnchorView(
    parent: View,
    container: HTMLElement,
    node: HTMLElement
  ): AnchorView {
    return {
      ...nodeWidthHeight_factory(node),
      ...offsets_factory(container, node),
      parent() {
        return parent;
      },
      is(kind) {
        return kind === "anchor";
      }
    };
  }

  function offsets_factory(container: HTMLElement, node: HTMLElement) {
    if (!container.contains(node)) {
      throw new Error(
        "`node` element must be a descendant of `container` element"
      );
    }

    function getDimension(dimension: "left" | "top") {
      const dimensionValue = insertTemporarily(container, () =>
        dimension === "left"
          ? node.getBoundingClientRect().left -
            container.getBoundingClientRect().left
          : node.getBoundingClientRect().top -
            container.getBoundingClientRect().top
      );

      return dimensionValue;
    }

    return {
      get offsetLeft() {
        return getDimension("left");
      },

      get offsetTop() {
        return getDimension("top");
      }
    };
  }

  function getAnchorOut_factory(
    parent: View,
    container: HTMLElement | null,
    key2anchorOut: Map<string | number, HTMLElement>
  ) {
    if (container === null) {
      throw new Error("container cannot be null");
    }

    const anchorOutViews = new Map(
      Array.from(key2anchorOut.values()).map(el => [
        el,
        createAnchorView(parent, container, el)
      ])
    );

    return {
      getAnchorOut(key: string | number) {
        const anchorElement = key2anchorOut.get(key);
        if (anchorElement === undefined) {
          throw new Error(`there is no anchor_out for "${key}"`);
        }
        return anchorOutViews.get(anchorElement)!;
      }
    };
  }

  function getAnchorIn_factory(
    parent: View,
    container: HTMLElement,
    node: HTMLElement
  ) {
    const anchorIn = createAnchorView(parent, container, node);

    return {
      getAnchorIn: () => anchorIn
    };
  }

  function draggableBehaviour_factory(view: HeapElementView) {
    const node = view.node();
    node.classList.add("draggable");

    const onWillDragHandlers: Array<
      (delta: { dx: number; dy: number }) => void
    > = [];

    function onWillDrag(callback: (delta: { dx: number; dy: number }) => void) {
      onWillDragHandlers.push(callback);
    }

    const onDraggedHandlers: Array<
      (newPosition: { x: number; y: number }) => void
    > = [];

    function onDragged(
      callback: (newPosition: { x: number; y: number }) => void
    ) {
      onDraggedHandlers.push(callback);
    }

    let mouseX = 0;
    let mouseY = 0;

    function onMouseMove(e: MouseEvent) {
      const newMouseX = e.clientX;
      const newMouseY = e.clientY;
      const delta = {
        dx: newMouseX - mouseX,
        dy: newMouseY - mouseY
      };

      onWillDragHandlers.forEach(callback => callback(delta));
      const newPosition = {
        x: view.x() + delta.dx,
        y: view.y() + delta.dy
      };
      view.x(newPosition.x);
      view.y(newPosition.y);
      onDraggedHandlers.forEach(callback => callback(newPosition));
      mouseX = newMouseX;
      mouseY = newMouseY;
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
    }

    node.addEventListener("mousedown", e => {
      e.stopPropagation();
      mouseX = e.clientX;
      mouseY = e.clientY;

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    return {
      onWillDrag,
      onDragged
    };
  }

  // helper
  function createValueNode(value: Value) {
    return d3
      .create("span")
      .attr("class", () => {
        switch (value.kind) {
          case "string":
            return "value__string";
          case "pointer":
            return "value__pointer";
          default:
            return "";
        }
      })
      .text(() => {
        if (value.kind === "number" || value.kind === "boolean") {
          return value.value;
        } else if (value.kind === "string") {
          return `"${value.value}"`;
        } else if (value.kind === "pointer") {
          return " "; // non-breaking space
        } else {
          return value.kind; // NaN, +-Infinity, null, undefined
        }
      });
  }

  function nodeWidthHeight_factory(node: HTMLElement | null) {
    if (node === null) {
      throw new Error("node cannot be null");
    }

    function getDimension(node: HTMLElement, dimension: "width" | "height") {
      const dimensionValue = insertTemporarily(node, () =>
        dimension === "width" ? node.clientWidth : node.clientHeight
      );

      return dimensionValue;
    }

    return {
      node() {
        return node;
      },

      get width() {
        return getDimension(node, "width");
      },

      get height() {
        return getDimension(node, "height");
      }
    };
  }

  /**
   * Utility function. Inserts a node in the DOM (if not already there),
   * executes the callback, and removes the DOM node again
   * (unless the node was already there).
   *
   * @returns Whatever the callback returns
   */
  function insertTemporarily<T>(node: HTMLElement, callback: () => T) {
    const isConnected = node.isConnected;
    const visibility = node.style.visibility;
    const parent = node.parentElement;
    const replacement = document.createElement("div");

    if (!isConnected) {
      parent?.replaceChild(replacement, node);
      node.style.visibility = "hidden";
      document.body.appendChild(node);
    }

    const result = callback();

    if (!isConnected) {
      node.style.visibility = visibility;
      document.body.removeChild(node);
      parent?.replaceChild(node, replacement);
    }

    return result;
  }

  return {
    createShallowArrayView,
    createShallowObjectView,
    createShallowStackFrameView,
    createCodeAreaView,
    createHeapFunctionView
  };
});
