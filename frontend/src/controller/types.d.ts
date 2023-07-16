/**
 * Top-level module which, given a `Trace` (see trace.d.ts), instantiates
 * all visualization objects and handles their state
 */

import { BrowserJsPlumbInstance } from "@jsplumb/browser-ui";
import { Trace } from "../trace/types";

export interface VisualizationController {
  advanceStep: () => void;
  backwardStep: () => void;
  destroy: () => void;
  isFirstStep: () => boolean;
  isLastStep: () => boolean;
}

export default interface ControllerModule {
  createVisualizationController(
    trace: Trace,
    visualizerContainer: HTMLElement,
    contextContainer: HTMLElement,
    heapContainer: HTMLElement,
    consoleWindowContainer: HTMLElement,
    jsplumbInstance: BrowserJsPlumbInstance
  ): VisualizationController;
}
