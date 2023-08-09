import type { BrowserJsPlumbInstance } from "@jsplumb/browser-ui";
import * as inspect from "browser-util-inspect";
import { Interpreter } from "../interpreter";
import { ConnectionRouter } from "../renderers/connection";
import { createConsoleLayouter } from "../renderers/console";
import { HeapLayouter } from "../renderers/heap";
import { StackLayouter } from "../renderers/stack";
import { ZoomService } from "../renderers/zoom";
import { StepRenderer } from "./step-renderer";

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
    const zoomService = new ZoomService(zoomContainer, visualizerContainer);
    zoomService.enableMouseZooming();
    this.stepRenderer = new StepRenderer(
      zoomService,
      new StackLayouter(stackContainer),
      new HeapLayouter(heapContainer, new ConnectionRouter(jsplumbInstance)),
      createConsoleLayouter(consoleWindowContainer)
    );

    this.reset(code);
  }

  reset(code: string) {
    const self = this;
    this.interpreter = new Interpreter(code, [
      [
        "input",
        function (log): number {
          const value = prompt("Digite um número:");
          const valueAsNumber = Number(value);
          return valueAsNumber;
        }
      ],
      [
        "output",
        function (log, content: any) {
          // fix: round near-integer numbers
          if (typeof content === "number") {
            content = Number(content.toFixed(6));
          }
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

  advanceStep(mode: "micro" | "macro") {
    this.interpreter.stepForward(mode);
    const step = this.interpreter.collectState();
    this.stepRenderer.renderStep(step);
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
