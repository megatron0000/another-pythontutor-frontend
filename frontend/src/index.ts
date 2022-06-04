/**
 * Root script file. Sets up the 2 pages of the application
 * (#edit and #visualize)
 */

type D3 = typeof import("d3");
type JSPlumb = typeof import("@jsplumb/browser-ui");
import { monaco as MonacoNamespace } from "../types/vendor/monaco";
import TraceModule, { Trace } from "../types/trace";
import ControllerModule, { VisualizationController } from "../types/controller";

require.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.27.0/min/vs",
    ace: "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.14",
    cola: "https://cdn.jsdelivr.net/npm/webcola@3.4.0/WebCola",
    d3: "https://d3js.org/",
    json: "https://cdnjs.cloudflare.com/ajax/libs/requirejs-plugins/1.0.2/json",
    text: "https://cdnjs.cloudflare.com/ajax/libs/require-text/2.0.12/text",
    "@jsplumb/browser-ui":
      "node_modules/@jsplumb/browser-ui/js/jsplumb.browser-ui.umd",
    "@jsplumb/core": "node_modules/@jsplumb/core/js/jsplumb.core.umd",
    "@jsplumb/util": "node_modules/@jsplumb/util/js/jsplumb.util.umd",
    "@jsplumb/common": "node_modules/@jsplumb/common/js/jsplumb.common.umd",
    acorn: "https://cdnjs.cloudflare.com/ajax/libs/acorn/8.7.0/acorn.min",
    jsframe: "node_modules/jsframe.js/lib/jsframe.min",
    console: "/build/console",
    controller: "/build/controller",
    diff: "/build/diff",
    layout: "/build/layout",
    parser: "/build/parser",
    trace: "/build/trace",
    view: "/build/view"
  },
  shim: {
    jsframe: {
      exports: "JSFrame"
    }
  }
});

require([
  "vs/editor/editor.main",
  // TODO: consider using webcola when we decide to do
  // a graph-based layout algorithm
  // "cola/cola",
  "d3/d3.v7",
  "@jsplumb/browser-ui",
  "./trace",
  "./controller"
], function (
  monaco: typeof MonacoNamespace,
  d3: D3,
  jsplumb: JSPlumb,
  { convertTrace }: TraceModule,
  { createVisualizationController }: ControllerModule
) {
  /**
   * 1: objects in the #visualize page
   */

  const visualizerContainer = document.querySelector(
    ".visualizer__container"
  ) as HTMLElement;

  const contextContainer = document.querySelector(
    ".visualizer__context__container"
  ) as HTMLElement;

  const heapContainer = document.querySelector(
    ".visualizer__heap__container"
  ) as HTMLElement;

  const zoomContainer = document.querySelector(
    ".zoom-container"
  ) as HTMLElement;

  const consoleWindowContainer = document.querySelector(
    ".console-window-container"
  ) as HTMLElement;

  const jsplumbInstance = jsplumb.newInstance({
    container: visualizerContainer,
    anchor: ["Bottom", "BottomLeft", "Left", "TopLeft", "Top"],
    endpoints: ["Dot", "Blank"],
    elementsDraggable: true
  });

  const buttonPrev = document.getElementById(
    "button-prev"
  ) as HTMLButtonElement;
  const buttonNext = document.getElementById(
    "button-next"
  ) as HTMLButtonElement;
  const buttonEdit = document.getElementById(
    "button-edit"
  ) as HTMLButtonElement;

  let controller: VisualizationController = {
    advanceStep: () => {},
    backwardStep: () => {},
    destroy: () => {},
    isFirstStep: () => true,
    isLastStep: () => true
  };

  /**
   * 2: objects in the #edit page
   */

  const buttonVisualize = document.getElementById(
    "visualize-execution-button"
  ) as HTMLButtonElement;

  /**
   * 3: setup logic for #edit page
   */

  // fix: trigger navigation even if user accesses the page with a hash
  // (for example, when user accesses "https://site.com/#visualize" directly)
  window.location.hash = "#edit";

  const editor = createMonacoEditor("monaco-container");

  // helper, used above
  function createMonacoEditor(containerId: string) {
    const code = localStorage.getItem("code") || 'console.log("hello world")';

    const editor = monaco.editor.create(document.getElementById(containerId)!, {
      value: code,
      language: "javascript",
      automaticLayout: true,
      minimap: {
        enabled: false
      }
    });

    editor.onDidChangeModelContent(e => {
      localStorage.setItem("code", editor.getValue());
    });

    return editor;
  }

  buttonVisualize.addEventListener("click", async () => {
    buttonVisualize.disabled = true;
    const textBackup = buttonVisualize.textContent;
    buttonVisualize.textContent = "Loading...";

    let pyTrace = null;
    try {
      const response = await fetch(
        // fix: use URLSearchParams to encode \n correctly
        `/visualize?${new URLSearchParams({
          code: editor.getValue()
        })}`
      );
      pyTrace = await response.json();
    } catch (err) {
      alert("Unknown error");
      buttonVisualize.disabled = false;
      buttonVisualize.textContent = textBackup;
      return;
    }

    if (pyTrace.trace[0].event === "uncaught_exception") {
      alert(
        pyTrace.trace[0].exception_msg +
          "\n" +
          "on line " +
          pyTrace.trace[0].line
      );

      buttonVisualize.disabled = false;
      buttonVisualize.textContent = textBackup;
      return;
    }

    let trace: Trace = { programCode: "", steps: [] };
    try {
      trace = convertTrace(pyTrace);
    } catch (err) {
      alert("Error: " + err);
    }

    controller.destroy();
    controller = createVisualizationController(
      trace,
      visualizerContainer,
      contextContainer,
      heapContainer,
      consoleWindowContainer,
      jsplumbInstance
    );
    visualizerContainer.style.transform = "";
    controller.advanceStep(); // display the first step
    buttonPrev.disabled = controller.isFirstStep();
    buttonNext.disabled = controller.isLastStep();
    buttonVisualize.disabled = false;
    buttonVisualize.textContent = textBackup;
    window.location.hash = "#visualize";
  });

  /**
   * 4: setup logic for #visualize page
   */

  buttonPrev.addEventListener("click", () => {
    controller.backwardStep();
    buttonPrev.disabled = controller.isFirstStep();
    buttonNext.disabled = controller.isLastStep();
  });

  buttonNext.addEventListener("click", () => {
    controller.advanceStep();
    buttonPrev.disabled = controller.isFirstStep();
    buttonNext.disabled = controller.isLastStep();
  });

  buttonEdit.addEventListener("click", () => {
    window.location.hash = "#edit";
  });

  // zoom and drag the scene
  // https://stackoverflow.com/questions/43903487/how-to-apply-d3-zoom-to-a-html-element
  d3.select<HTMLElement, unknown>(zoomContainer).call(
    d3.zoom<HTMLElement, unknown>().on("zoom", function (event) {
      const transform = event.transform;
      visualizerContainer.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`;
      visualizerContainer.style.transformOrigin = "0 0";
    })
  );
});
