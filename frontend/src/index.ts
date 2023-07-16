/**
 * Root script file. Sets up the 2 pages of the application
 * (#edit and #visualize)
 */

import { Trace } from "../types/trace";
import { VisualizationController } from "../types/controller";

import * as jsplumb from "@jsplumb/browser-ui";

import * as d3 from "d3";

import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import { lint } from "./linter";

import { convertTrace } from "./trace";
import { createVisualizationController } from "./controller";

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

const zoomContainer = document.querySelector(".zoom-container") as HTMLElement;

const consoleWindowContainer = document.querySelector(
  ".console-window-container"
) as HTMLElement;

const jsplumbInstance = jsplumb.newInstance({
  container: visualizerContainer,
  anchor: ["Bottom", "BottomLeft", "Left", "TopLeft", "Top"],
  endpoints: ["Dot", "Blank"],
  elementsDraggable: true
});

const buttonPrev = document.getElementById("button-prev") as HTMLButtonElement;
const buttonNext = document.getElementById("button-next") as HTMLButtonElement;
const buttonEdit = document.getElementById("button-edit") as HTMLButtonElement;

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

  async function lintAndMark() {
    const code = editor.getValue();
    const lintResult = await lint(code);
    const markers = lintResult.map(function (message) {
      return {
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: message.line,
        startColumn: message.column,
        endLineNumber: message.endLine!,
        endColumn: message.endColumn!,
        message: message.message
      };
    });

    monaco.editor.setModelMarkers(editor.getModel()!, "eslint", markers);
  }

  lintAndMark();
  editor.onDidChangeModelContent(lintAndMark);

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
      `/api/visualize?${new URLSearchParams({
        code: editor.getValue()
      })}`
    );
    pyTrace = await response.json();
  } catch (err) {
    alert("Unknown error.\nTry reloading the page.");
    buttonVisualize.disabled = false;
    buttonVisualize.textContent = textBackup;
    return;
  }

  if (pyTrace.trace[0].event === "uncaught_exception") {
    alert(
      pyTrace.trace[0].exception_msg + "\n" + "on line " + pyTrace.trace[0].line
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
  buttonPrev.disabled = controller.isFirstStep();
  buttonNext.disabled = controller.isLastStep();
  buttonVisualize.disabled = false;
  buttonVisualize.textContent = textBackup;

  // fix: the hash must change first (which triggers the CSS to display the #visualize HTML),
  // before the call to advanceStep().
  // Otherwise, the controller is unable to calculate coordinates
  // (because the page has not been loaded) and the connection arrows
  // end up pointing to the wrong place (the origin)
  window.location.hash = "#visualize";
  controller.advanceStep(); // display the first step
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
