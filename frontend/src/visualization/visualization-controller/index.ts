import type { BrowserJsPlumbInstance } from "@jsplumb/browser-ui";
import * as inspect from "browser-util-inspect";
import { Interpreter } from "../../code/interpreter";
import { ConnectionLayouter } from "../layouters/connection/connection-layouter";
import { createConsoleLayouter } from "../layouters/console";
import { HeapLayouter } from "../layouters/heap";
import { StackLayouter } from "../layouters/stack";
import { ZoomHandler } from "./lib/zoom-handler";
import { StepRenderer } from "./lib/step-renderer";
import { StackFrameShowHideTracker } from "./lib/stack-frame-show-hide-tracker";

export class VisualizationController {
  // @ts-expect-error : the interpreter IS definitely assigned
  // in the constructor because it calls reset()
  private interpreter: Interpreter;
  private stepRenderer: StepRenderer;

  constructor(
    code: string,
    zoomContainer: HTMLElement,
    visualizerContainer: HTMLElement,
    stackContainer: HTMLElement,
    heapContainer: HTMLElement,
    consoleWindowContainer: HTMLElement,
    jsplumbInstance: BrowserJsPlumbInstance
  ) {
    const zoomService = new ZoomHandler(zoomContainer, visualizerContainer);
    zoomService.enableMouseZooming();
    this.stepRenderer = new StepRenderer(
      zoomService,
      new StackFrameShowHideTracker(),
      new StackLayouter(stackContainer),
      new HeapLayouter(heapContainer, new ConnectionLayouter(jsplumbInstance)),
      createConsoleLayouter(consoleWindowContainer)
    );

    this.reset(code);
  }

  reset(code: string) {
    const self = this;
    this.interpreter = new Interpreter(code, [
      [
        "input",
        function (log, throwException): number {
          const value = prompt("Digite um número:");
          if (value === null) {
            throwException("Entrada cancelada");
            return 0;
          }
          const valueAsNumber = Number(value);
          if (isNaN(valueAsNumber)) {
            throw throwException("Entrada não é um número");
            return 0;
          }
          return valueAsNumber;
        }
      ],
      [
        "output",
        function (log, throwException, content: any) {
          const serializedContent = inspect(content, { depth: 3 });
          log(serializedContent);
        }
      ]
    ]);
  }

  renderCurrentStep() {
    const step = this.interpreter.collectState();
    this.stepRenderer.renderStep(step);
  }

  /**
   * Saves the current state and console collector,
   * advances the interpreter one step forward,
   * and renders the new step.
   */
  advanceStep(
    mode: "micro" | "macro",
    { forceSaveAs }: { forceSaveAs?: "micro" | "macro" } = {}
  ) {
    this.interpreter.stepForward(mode, { forceSaveAs });
    const step = this.interpreter.collectState();
    this.stepRenderer.renderStep(step);
  }

  /**
   * Advances the interpreter one step forward WITHOUT saving state or console collector.
   * Used for turbo mode where we want to skip state serialization for performance.
   * Does NOT render the step.
   */
  advanceStepWithoutSavingOrRendering(mode: "micro" | "macro") {
    this.interpreter.stepForward(mode, { saveState: false });
  }

  /**
   * Returns true if the current state is on a DebuggerStatement
   */
  isOnDebugger(): boolean {
    return this.interpreter.isOnDebugger();
  }

  /**
   * Returns true if the interpreter is about to call the "input" function
   */
  isAboutToInput(): boolean {
    const callTarget = this.interpreter.getCallTarget();
    return callTarget !== null && callTarget.calleeName === "input";
  }

  backwardStep(mode: "micro" | "macro") {
    this.interpreter.stepBackward(mode);
    const step = this.interpreter.collectState();
    this.stepRenderer.renderStep(step);
  }

  isFirstStep() {
    return this.interpreter.isFirstStep();
  }

  isLastStep() {
    return this.interpreter.isLastStep();
  }
}
