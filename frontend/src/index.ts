/**
 * Root script file. Sets up the 2 pages of the application
 * (#edit and #visualize)
 */

import * as jsplumb from "@jsplumb/browser-ui";

import { VisualizationController } from "./controller";
import { lint } from "./linter";

// https://github.com/ajaxorg/ace/issues/4782#issuecomment-1141347415
import * as ace from "ace-builds";
import "ace-builds/webpack-resolver";

/**
 * 1: objects in the #visualize page
 */

const visualizerContainer = document.querySelector(
  ".visualizer__container"
) as HTMLElement;

const stackContainer = document.querySelector(
  ".visualizer__stack__container"
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

const buttonPrevMicro = document.getElementById(
  "button-prev-micro"
) as HTMLButtonElement;
const buttonNextMicro = document.getElementById(
  "button-next-micro"
) as HTMLButtonElement;
const buttonPrevMacro = document.getElementById(
  "button-prev-macro"
) as HTMLButtonElement;
const buttonNextMacro = document.getElementById(
  "button-next-macro"
) as HTMLButtonElement;
const buttonEdit = document.getElementById("button-edit") as HTMLButtonElement;

let controller = new VisualizationController(
  "",
  zoomContainer,
  visualizerContainer,
  stackContainer,
  heapContainer,
  consoleWindowContainer,
  jsplumbInstance
);

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

const editor = createEditor("monaco-container");

function createEditor(containerId: string) {
  const editor = ace.edit(containerId, {
    fontSize: 15,
    theme: "ace/theme/chrome",
    mode: "ace/mode/javascript",
    maxLines: Infinity, // trick to make container height resize with editor content,
    value: localStorage.getItem("code") || "",
    keyboardHandler: "ace/keyboard/vscode"
  });

  // disable syntax checking
  editor.session.setOption("useWorker", false);

  editor.session.on("change", () => {
    localStorage.setItem("code", editor.getValue());
    lintAndMark();
  });

  // `lintNumber` used to avoid race conditions because
  // lintAndMark is async
  let lintNumber = 0;
  let previousMarkers: number[] = [];
  lintAndMark();

  async function lintAndMark() {
    // remove markers
    for (const previousMarker of previousMarkers) {
      editor.session.removeMarker(previousMarker);
    }

    // lint
    const code = editor.getValue();
    let lintNumberBak = ++lintNumber;
    const lintResult = await lint(code);
    if (lintNumberBak !== lintNumber) {
      return;
    }

    // show markers
    previousMarkers = lintResult.map(message =>
      editor.session.addMarker(
        new ace.Range(
          message.line - 1,
          message.column - 1,
          typeof message.endLine === "number"
            ? message.endLine - 1
            : message.line,
          typeof message.endColumn === "number"
            ? message.endColumn - 1
            : message.column
        ),
        "error-marker",
        "text",
        true
      )
    );

    editor.session.setAnnotations(
      lintResult.map(message => ({
        row: message.line! - 1,
        column: message.column - 1,
        text: message.message,
        type: "error"
      }))
    );
  }

  return editor;
}

buttonVisualize.addEventListener("click", async () => {
  // fix: the hash must change first (which triggers the CSS to display the #visualize HTML),
  // before building the controller
  // Otherwise, the controller is unable to calculate coordinates
  // (because the page has not been loaded) and the connection arrows
  // end up pointing to the wrong place (the origin)
  window.location.hash = "#visualize";

  buttonVisualize.disabled = true;
  buttonVisualize.textContent = "Carregando...";

  controller.reset(editor.getValue());
  controller.renderCurrentStep();
  maybeDisableStepButtons();

  buttonVisualize.disabled = false;
  buttonVisualize.textContent = "Executar";
  buttonVisualize.style.display = "none";
  buttonEdit.style.display = "block";
});

/**
 * Now that the page has loaded, enable the button
 */
buttonVisualize.disabled = false;
buttonVisualize.textContent = "Executar";

/**
 * 4: setup logic for #visualize page
 */

function maybeDisableStepButtons() {
  buttonPrevMicro.disabled = controller.isFirstStep();
  buttonNextMicro.disabled = controller.isLastStep();
  buttonPrevMacro.disabled = controller.isFirstStep();
  buttonNextMacro.disabled = controller.isLastStep();
}

buttonPrevMicro.addEventListener("click", () => {
  controller.backwardStep("micro");
  maybeDisableStepButtons();
});

buttonNextMicro.addEventListener("click", () => {
  controller.advanceStep("micro");
  maybeDisableStepButtons();
});

buttonPrevMacro.addEventListener("click", () => {
  controller.backwardStep("macro");
  maybeDisableStepButtons();
});

buttonNextMacro.addEventListener("click", () => {
  controller.advanceStep("macro");
  maybeDisableStepButtons();
});

buttonEdit.addEventListener("click", () => {
  window.location.hash = "#edit";
  buttonVisualize.style.display = "block";
});
