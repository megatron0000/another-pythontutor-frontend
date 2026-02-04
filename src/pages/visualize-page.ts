import * as jsplumb from "@jsplumb/browser-ui";

import { VisualizationController } from "../lib/visualization/visualization-controller";
import { showErrorModal } from "../components/error-modal";
import type { PageLifecycle } from "./page-lifecycle";

export function createVisualizePage(options: {
  getEditorValue: () => string;
  onEdit: () => void;
}): PageLifecycle {
  const visualizerContainer = document.querySelector(
    ".visualizer__container"
  ) as HTMLElement;

  const stackContainer = document.querySelector(
    ".visualizer__stack__container"
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
  const buttonEdit = document.getElementById(
    "button-edit"
  ) as HTMLButtonElement;
  const turboOverlay = document.getElementById("turbo-overlay") as HTMLElement;
  const mouseLoader = document.getElementById("mouse-loader") as HTMLElement;

  // Keep the edit button hidden until the visualize page is active.
  buttonEdit.style.display = "none";

  const controller = new VisualizationController(
    "",
    zoomContainer,
    visualizerContainer,
    stackContainer,
    heapContainer,
    consoleWindowContainer,
    jsplumbInstance
  );

  function updateStepButtons() {
    buttonPrevMicro.disabled = controller.isFirstStep();
    buttonNextMicro.disabled = controller.isLastStep();
    buttonPrevMacro.disabled = controller.isFirstStep();
    buttonNextMacro.disabled = controller.isLastStep();
    buttonRunAll.disabled = false;
    setRunAllIcon(controller.isLastStep() ? "restart" : "play");
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

  function setRunAllIcon(icon: "play" | "pause" | "restart") {
    const iconElement = buttonRunAll.querySelector("i");
    if (!iconElement) return;
    iconElement.classList.remove("fa-play", "fa-pause", "fa-rotate-left");
    if (icon === "play") {
      iconElement.classList.add("fa-play");
      buttonRunAll.title = "executar tudo (segure para modo turbo)";
      return;
    }
    if (icon === "pause") {
      iconElement.classList.add("fa-pause");
      buttonRunAll.title = "pausar";
      return;
    }
    iconElement.classList.add("fa-rotate-left");
    buttonRunAll.title = "voltar ao início";
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

  // Delay before showing the loading indicator (ms)
  const TURBO_INDICATOR_DELAY = 250;
  // Duration of loading animation (ms)
  const TURBO_LOADING_DURATION = 500;

  /**
   * State machine for play button modes
   */
  type PlayMode =
    | "standby" // Normal state, nothing running
    | "play" // Normal play mode (running with state saving)
    | "turbo-loading" // Loading indicator showing, waiting to start turbo
    | "turbo"; // Turbo mode running

  let currentMode: PlayMode = "standby";
  let indicatorTimer: any = null;
  let turboTimer: any = null;
  let shouldRenderOnTurboStop: boolean = true;
  let lastModeChangeTimestamp: number = 0; // When mode last changed
  let mouseDownTimestamp: number = 0; // When mousedown happened

  /**
   * Helper to change mode and record timestamp
   */
  const setMode = (newMode: PlayMode) => {
    if (currentMode !== newMode) {
      currentMode = newMode;
      if (newMode !== "standby") {
        lastModeChangeTimestamp = Date.now();
      }
    }
  };

  /**
   * Transition to standby mode
   */
  const transitionToStandby = () => {
    // Cleanup any pending timers
    if (indicatorTimer) {
      clearTimeout(indicatorTimer);
      indicatorTimer = null;
    }
    if (turboTimer) {
      clearTimeout(turboTimer);
      turboTimer = null;
    }
    mouseLoader.style.display = "none";
    turboOverlay.style.display = "none";

    setRunAllIcon(controller.isLastStep() ? "restart" : "play");
    enableEditButton();
    updateStepButtons();

    setMode("standby");
  };

  /**
   * Start turbo loading (mouse held down)
   */
  const startTurboLoading = (mouseX: number, mouseY: number) => {
    if (currentMode !== "standby") return;

    let currentModeTimestamp = lastModeChangeTimestamp;

    // First timer: delay before showing loading indicator
    clearTimeout(indicatorTimer);
    indicatorTimer = setTimeout(() => {
      if (currentModeTimestamp !== lastModeChangeTimestamp) {
        // Mode changed since timer started - abort
        return;
      }

      setMode("turbo-loading");
      currentModeTimestamp = lastModeChangeTimestamp;

      mouseLoader.style.display = "block";
      mouseLoader.style.left = mouseX + "px";
      mouseLoader.style.top = mouseY + "px";

      // Restart animation
      const circle = mouseLoader.querySelector(".circle") as HTMLElement;
      circle.style.animation = "none";
      circle.offsetHeight; /* trigger reflow */
      circle.style.animation = `loader-fill ${TURBO_LOADING_DURATION}ms linear forwards`;

      // Second timer: trigger turbo after loading animation completes
      clearTimeout(turboTimer);
      turboTimer = setTimeout(() => {
        if (currentModeTimestamp !== lastModeChangeTimestamp) {
          // Mode changed since timer started - abort
          return;
        }
        startTurboMode();
      }, TURBO_LOADING_DURATION);
    }, TURBO_INDICATOR_DELAY);
  };

  /**
   * Cancel turbo loading (mouse released before turbo started)
   * Returns true if it was actually cancelled (was in turbo-loading state)
   */
  const cancelTurboLoading = (): boolean => {
    if (indicatorTimer) {
      clearTimeout(indicatorTimer);
      indicatorTimer = null;
    }
    if (turboTimer) {
      clearTimeout(turboTimer);
      turboTimer = null;
    }
    if (currentMode !== "turbo-loading") {
      return false;
    }
    transitionToStandby();
    return true;
  };

  // Delay before turbo execution starts (ms) - gives user visual feedback
  const TURBO_STARTUP_DELAY = 1000;

  /**
   * Start turbo mode
   */
  const startTurboMode = async () => {
    setMode("turbo");
    shouldRenderOnTurboStop = true;

    disableStepButtons();
    disableEditButton();
    // Keep edit button enabled
    setRunAllIcon("pause");

    turboOverlay.style.display = "flex";
    mouseLoader.style.display = "none";

    // Wait a bit so user can see the turbo overlay before execution starts
    await sleep(TURBO_STARTUP_DELAY);

    // Check if turbo was cancelled during the delay
    if (currentMode !== "turbo") {
      transitionToStandby();
      return;
    }

    let lastYieldTime = performance.now();
    let isFirstStep = true;

    while (currentMode === "turbo" && !controller.isLastStep()) {
      // Check BEFORE advancing if about to call input
      if (controller.isAboutToInput()) {
        controller.renderCurrentStep();
        // Yield to allow UI to render before prompt opens
        await sleep(50);

        // Execute the input step normally (with state saving, shows prompt)
        if (
          ifErrorOpenModal(() =>
            controller.advanceStep("macro", { forceSaveAs: "macro" })
          )
        )
          break;
        isFirstStep = false;

        // Continue turbo loop
        continue;
      }

      // First step saves state so user can go back to where turbo started
      // Subsequent steps don't save (turbo mode)
      if (
        ifErrorOpenModal(() => {
          if (isFirstStep) {
            controller.advanceStep("micro", { forceSaveAs: "macro" });
            isFirstStep = false;
          } else {
            controller.advanceStepWithoutSavingOrRendering("micro");
          }
        })
      ) {
        break;
      }

      // Check AFTER advancing if we landed on debugger
      if (controller.isOnDebugger()) {
        controller.renderCurrentStep();
        break;
      }

      // Yield to allow UI events (click on pause button)
      if (performance.now() - lastYieldTime > 8) {
        lastYieldTime = performance.now();
        await sleep(0);
      }
    }

    // Final render when turbo stops (unless skipped)
    if (shouldRenderOnTurboStop) {
      controller.renderCurrentStep();
    }

    transitionToStandby();
  };

  /**
   * Stop turbo mode (pause button clicked or edit clicked)
   */
  const stopTurboMode = (skipRender: boolean = false) => {
    if (currentMode !== "turbo") return;

    shouldRenderOnTurboStop = !skipRender;

    enableEditButton();

    // Signal the turbo loop to stop by changing mode
    // The loop will see currentMode !== "turbo" and exit
    // Then it will check shouldRenderOnTurboStop to decide whether to render
    setMode("standby");
  };

  /**
   * Start normal play mode
   */
  const startPlayMode = async () => {
    if (currentMode !== "standby") return;

    disableStepButtons();
    disableEditButton();
    setRunAllIcon("pause");

    setMode("play");

    while ((currentMode as PlayMode) === "play" && !controller.isLastStep()) {
      if (ifErrorOpenModal(() => controller.advanceStep("macro"))) break;
      await sleep(10);
    }

    transitionToStandby();
  };

  /**
   * Stop normal play mode
   */
  const stopPlayMode = () => {
    if (currentMode !== "play") return;
    setMode("standby");
  };

  // Event handlers

  buttonRunAll.addEventListener("mousedown", e => {
    if (buttonRunAll.disabled) return;
    mouseDownTimestamp = lastModeChangeTimestamp;
    if (currentMode !== "standby") return;
    startTurboLoading(e.clientX, e.clientY);
  });

  buttonRunAll.addEventListener("touchstart", e => {
    if (buttonRunAll.disabled) return;
    mouseDownTimestamp = lastModeChangeTimestamp;
    if (currentMode !== "standby") return;
    const touch = e.touches[0];
    startTurboLoading(touch.clientX, touch.clientY);
  });

  buttonRunAll.addEventListener("mouseup", () => {
    cancelTurboLoading();
  });

  buttonRunAll.addEventListener("touchend", () => {
    cancelTurboLoading();
  });

  buttonRunAll.addEventListener("touchcancel", () => {
    cancelTurboLoading();
  });

  buttonRunAll.addEventListener("mouseleave", () => {
    cancelTurboLoading();
  });

  buttonRunAll.addEventListener("click", () => {
    // If mode changed since mousedown, ignore this click
    // (the mode change was caused by the mouse interaction, not a deliberate click)
    if (lastModeChangeTimestamp !== mouseDownTimestamp) {
      return;
    }

    switch (currentMode) {
      case "standby":
        if (controller.isLastStep()) {
          ifErrorOpenModal(() => {
            controller.reset(options.getEditorValue());
            controller.renderCurrentStep();
          });
          updateStepButtons();
          break;
        }
        // Start normal play mode
        startPlayMode();
        break;
      case "turbo-loading":
        // Cancel turbo loading and start normal play
        cancelTurboLoading();
        startPlayMode();
        break;
      case "play":
        // Stop normal play mode
        stopPlayMode();
        break;
      case "turbo":
        // Stop turbo mode (this is a deliberate click to pause)
        stopTurboMode();
        break;
    }
  });

  buttonEdit.addEventListener("click", () => {
    // Stop turbo if running (skip render since we're leaving the visualization)
    stopTurboMode(true);
    // Also stop play mode if running
    stopPlayMode();
    options.onEdit();
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
      showErrorModal(options.getEditorValue(), err);
      return true;
    }
  }

  const startup = () => {
    ifErrorOpenModal(() => {
      controller.reset(options.getEditorValue());
      controller.renderCurrentStep();
    });
    updateStepButtons();
    buttonEdit.style.display = "block";
    enableEditButton();
  };

  const teardown = () => {
    cancelTurboLoading();
    stopTurboMode(true);
    stopPlayMode();
    transitionToStandby();
    buttonEdit.style.display = "none";
  };

  return {
    startup,
    teardown
  };
}
