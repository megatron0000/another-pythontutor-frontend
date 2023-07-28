/**
 * Root script file. Sets up the 2 pages of the application
 * (#edit and #visualize)
 */

import * as jsplumb from "@jsplumb/browser-ui";

import { VisualizationController } from "./controller";
import { createEditor } from "./app/code-editor";
import { showErrorModal } from "./app/error-modal";

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

const editor = createEditor(
  "code-editor-container",
  localStorage.getItem("code") || "",
  newCode => {
    localStorage.setItem("code", newCode);
  }
);

buttonVisualize.addEventListener("click", async () => {
  // fix: the hash must change first (which triggers the CSS to display the #visualize HTML),
  // before building the controller
  // Otherwise, the controller is unable to calculate coordinates
  // (because the page has not been loaded) and the connection arrows
  // end up pointing to the wrong place (the origin)
  window.location.hash = "#visualize";

  buttonVisualize.disabled = true;
  buttonVisualize.textContent = "Carregando...";

  ifErrorOpenModal(() => {
    controller.reset(editor.getValue());
    controller.renderCurrentStep();
  });
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
  ifErrorOpenModal(() => controller.backwardStep("micro"));
  maybeDisableStepButtons();
});

buttonNextMicro.addEventListener("click", () => {
  ifErrorOpenModal(() => controller.advanceStep("micro"));
  maybeDisableStepButtons();
});

buttonPrevMacro.addEventListener("click", () => {
  ifErrorOpenModal(() => controller.backwardStep("macro"));
  maybeDisableStepButtons();
});

buttonNextMacro.addEventListener("click", () => {
  ifErrorOpenModal(() => controller.advanceStep("macro"));
  maybeDisableStepButtons();
});

buttonEdit.addEventListener("click", () => {
  window.location.hash = "#edit";
  buttonVisualize.style.display = "block";
});

function ifErrorOpenModal(callback: Function) {
  try {
    callback();
  } catch (err) {
    showErrorModal(editor.getValue(), err);
  }
}
