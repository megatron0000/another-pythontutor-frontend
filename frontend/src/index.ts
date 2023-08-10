/**
 * Root script file. Sets up the 2 pages of the application
 * (#edit and #visualize)
 */

import * as jsplumb from "@jsplumb/browser-ui";

import { VisualizationController } from "./controller";
import { createEditor } from "./app/code-editor";
import { showErrorModal } from "./app/error-modal";

/**
 * Navigation
 */

window.addEventListener("hashchange", event => {
  const hash = event.newURL.slice(event.newURL.indexOf("#"));
  console.log(hash);

  document
    .querySelectorAll<HTMLElement>("main > section")
    .forEach(el => (el.style.display = "none"));
  document.querySelector<HTMLElement>(hash)!.style.display = "block";
});

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
const buttonRunAll = document.getElementById(
  "button-run-all"
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
  "// Aprenda os controles na página de ajuda\n// (botão '?' no canto direito superior)",
  newCode => {
    // TODO: remove unused code: not needed anymore because we disabled
    // saving to local storage
    // localStorage.setItem("code", newCode);
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
  updateStepButtons();

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

function updateStepButtons() {
  buttonPrevMicro.disabled = controller.isFirstStep();
  buttonNextMicro.disabled = controller.isLastStep();
  buttonPrevMacro.disabled = controller.isFirstStep();
  buttonNextMacro.disabled = controller.isLastStep();
}

function disableStepButtons() {
  buttonPrevMicro.disabled = true;
  buttonNextMicro.disabled = true;
  buttonPrevMacro.disabled = true;
  buttonNextMacro.disabled = true;
}

function disableEditButton() {
  buttonEdit.disabled = true;
}

function enableEditButton() {
  buttonEdit.disabled = false;
}

buttonPrevMicro.addEventListener("click", () => {
  ifErrorOpenModal(() => controller.backwardStep("micro"));
  updateStepButtons();
});

buttonNextMicro.addEventListener("click", () => {
  ifErrorOpenModal(() => controller.advanceStep("micro"));
  updateStepButtons();
});

buttonPrevMacro.addEventListener("click", () => {
  ifErrorOpenModal(() => controller.backwardStep("macro"));
  updateStepButtons();
});

buttonNextMacro.addEventListener("click", () => {
  ifErrorOpenModal(() => controller.advanceStep("macro"));
  updateStepButtons();
});

const ICON_ARROWS_DOWN_TO_LINE =
  '<i class="fa-solid fa-arrows-down-to-line"></i>';

const ICON_PAUSE = '<i class="fa fa-pause"></i>';

let isRunningAll = false;

buttonRunAll.addEventListener("click", async () => {
  if (isRunningAll) {
    isRunningAll = false; // stop the loop below
    return;
  }

  disableStepButtons();
  disableEditButton();
  buttonRunAll.innerHTML = ICON_PAUSE;
  isRunningAll = true;
  while (isRunningAll && !controller.isLastStep()) {
    if (ifErrorOpenModal(() => controller.advanceStep("macro"))) break;
    await sleep(10); // async so that the UI does not freeze (the user can pause)
  }
  isRunningAll = false;
  buttonRunAll.innerHTML = ICON_ARROWS_DOWN_TO_LINE;
  enableEditButton();
  updateStepButtons();
});

buttonEdit.addEventListener("click", () => {
  window.location.hash = "#edit";
  buttonVisualize.style.display = "block";
});

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @returns false if the callback did not throw. true if it threw an error
 */
function ifErrorOpenModal(callback: Function) {
  try {
    callback();
    return false;
  } catch (err) {
    showErrorModal(editor.getValue(), err);
    return true;
  }
}

/**
 * 5: warning on exit page
 */

// https://stackoverflow.com/a/7317311
window.addEventListener("beforeunload", function (e) {
  if (!editor.getValue()) return undefined;

  const confirmationMessage =
    "Seu código não será salvo. Se necessário, salve-o antes de sair";

  (e || window.event).returnValue = confirmationMessage; //Gecko + IE
  return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
});
