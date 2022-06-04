import { BrowserJsPlumbInstance } from "@jsplumb/browser-ui";
import ConsoleModule from "../types/console";
import ControllerModule from "../types/controller";
import DiffModule from "../types/diff";
import LayoutModule from "../types/layout";
import ParserModule from "../types/parser";
import { HeapElementId, StackFrameId, Trace } from "../types/trace";
import ViewModule, {
  CodeAreaView,
  HeapElementView,
  StackFrameView,
  View
} from "../types/view";

define(["./parser", "./layout", "./view", "./diff", "./console"], function (
  { parseCode }: ParserModule,
  {
    calculateHeapRows,
    createContextLayouter,
    createConnectionRouter,
    calculateHeapCoordinates,
    calculateConnections
  }: LayoutModule,
  {
    createCodeAreaView,
    createHeapFunctionView,
    createShallowArrayView,
    createShallowObjectView,
    createShallowStackFrameView
  }: ViewModule,
  { diffHeap, diffStack }: DiffModule,
  { createConsole }: ConsoleModule
): ControllerModule {
  // helper
  function preprocessTrace(trace: Trace) {
    const parsedProgramCode = parseCode(trace.programCode);
    const heapId2View: Map<HeapElementId, HeapElementView> = new Map();
    const frameId2FrameView: Map<StackFrameId, StackFrameView> = new Map();
    const frameId2CodeAreaView: Map<StackFrameId, CodeAreaView> = new Map();
    const stepHeapRows: HeapElementId[][] = [];

    for (let stepIndex = 0; stepIndex < trace.steps.length; stepIndex++) {
      const step = trace.steps[stepIndex];

      const rows = calculateHeapRows(step, stepHeapRows.slice(-1)[0] || []);
      stepHeapRows.push(rows);

      for (const id of Object.keys(step.heap).filter(
        id => !heapId2View.has(id)
      )) {
        const elem = step.heap[id];

        let view: HeapElementView;

        if (elem.kind === "array") {
          view = createShallowArrayView(elem);
        } else if (elem.kind === "object") {
          view = createShallowObjectView(elem);
        } else if (elem.kind === "function") {
          view = createHeapFunctionView(elem.code);
        } else {
          ((_: never): never => {
            throw new Error("unhandled element kind");
          })(elem);
        }

        // heapContainer.append(() => view.node());
        heapId2View.set(id, view);
      }

      step.stack_frames
        .filter(frame => !frameId2FrameView.has(frame.frame_id))
        // there will be 0 or 1 frame left (because a step has at most 1 frame more
        // than the previous step)
        .forEach(frame => {
          const frameView = createShallowStackFrameView(frame);
          frameId2FrameView.set(frame.frame_id, frameView);

          const functionRange = parsedProgramCode
            .location2FunctionStack(step.line, step.col)
            .slice(-1)[0];
          const frameFunctionCode =
            functionRange === undefined
              ? trace.programCode
              : parsedProgramCode.codeRange(functionRange);
          const codeAreaView = createCodeAreaView(
            frameFunctionCode,
            functionRange === undefined ? 1 : functionRange.start[0]
          );
          frameId2CodeAreaView.set(frame.frame_id, codeAreaView);
        });
    }

    return {
      parsedProgramCode,
      heapId2View,
      frameId2FrameView,
      frameId2CodeAreaView,
      stepHeapRows
    };
  }

  return {
    createVisualizationController(
      trace: Trace,
      visualizerContainer: HTMLElement,
      contextContainer: HTMLElement,
      heapContainer: HTMLElement,
      consoleWindowContainer: HTMLElement,
      jsplumbInstance: BrowserJsPlumbInstance
    ) {
      const {
        heapId2View,
        frameId2FrameView,
        frameId2CodeAreaView,
        stepHeapRows
      } = preprocessTrace(trace);

      const consoleView = createConsole(consoleWindowContainer);
      const contextLayouter = createContextLayouter(contextContainer);
      const connectionRouter = createConnectionRouter(jsplumbInstance);

      // lock positions if user drags manually
      const draggedView2position: Map<View, [number, number]> = new Map();
      for (const view of heapId2View.values()) {
        view.onDragged(({ x, y }) => draggedView2position.set(view, [x, y]));
      }

      // account for page zoom because internal draggable behaviour is "not aware"
      // of scaling on the page
      for (const view of heapId2View.values()) {
        view.onWillDrag(delta => {
          // based on:
          // https://stackoverflow.com/questions/45121905/read-css-scale-value-using-js-or-jquery?noredirect=1&lq=1
          const scale = parseFloat(
            visualizerContainer.style.transform.match(
              /scale\(([^)]+)\)/
            )?.[1] || "1"
          );
          delta.dx *= 1 / scale;
          delta.dy *= 1 / scale;
        });
      }

      // helper
      function renderStep(stepIndex: number, prevStepIndex: number) {
        const step = trace.steps[stepIndex];
        const prevStep = trace.steps[prevStepIndex];

        const oneStepBackIndex = stepIndex - 1;
        const oneStepBack = trace.steps[oneStepBackIndex];

        const activeCodeView = frameId2CodeAreaView.get(
          step.stack_frames.slice(-1)[0].frame_id
        )!;
        const activeFrameView = frameId2FrameView.get(
          step.stack_frames.slice(-1)[0].frame_id
        )!;

        // highlight inactive lines of the frames which are buried inside the stack
        const currentStackedFrameIds = step.stack_frames
          .slice(0, -1)
          .map(x => x.frame_id);
        for (
          let pastStepIndex = 0;
          pastStepIndex < stepIndex;
          pastStepIndex++
        ) {
          const pastStep = trace.steps[pastStepIndex];
          const pastStepTopFrame = pastStep.stack_frames.slice(-1)[0];
          if (currentStackedFrameIds.includes(pastStepTopFrame.frame_id)) {
            frameId2CodeAreaView
              .get(pastStepTopFrame.frame_id)
              ?.highlightPreviousLine(pastStep.line);
            frameId2CodeAreaView
              .get(pastStepTopFrame.frame_id)
              ?.highlightCurrentLine(-1);
          }
        }

        // set only the current (last) frame as active
        for (const frameId of currentStackedFrameIds) {
          frameId2FrameView.get(frameId)?.setActive(false);
        }
        activeFrameView.setActive(true);

        // highlight current line of the active stack frame
        activeCodeView.highlightCurrentLine(
          stepIndex === trace.steps.length - 1 // do not highlight if last step
            ? -1
            : step.event === "return"
            ? step.line + 0.5
            : step.line
        );

        // highlight previous line of the active stack frame
        activeCodeView.highlightPreviousLine(findPreviousLine());

        // helper, used above
        function findPreviousLine() {
          const oneStepBackExists = oneStepBackIndex !== -1;
          if (!oneStepBackExists) {
            return -1;
          }
          const wasInSameFunction =
            oneStepBack.stack_frames.length === step.stack_frames.length;
          if (wasInSameFunction) {
            return oneStepBack.event === "return"
              ? oneStepBack.line + 0.5
              : oneStepBack.line;
          }
          // was not in same function. either this is the first time the user code
          // is entering this function, or the user code is coming back to this function
          // after another subroutine call
          const isEnteringFunctionFirstTime =
            oneStepBack.stack_frames.length === step.stack_frames.length - 1;
          if (isEnteringFunctionFirstTime) {
            return -1;
          }
          // find the last time this function was in scope
          for (let i = stepIndex - 1; i >= 0; i--) {
            const candidateStep = trace.steps[i];
            const isSameFunction =
              candidateStep.stack_frames.length === step.stack_frames.length;
            if (isSameFunction) {
              return candidateStep.line;
            }
          }

          throw new Error("could not find previous line");
        }

        contextLayouter.rerender(
          step.stack_frames.map(x => x.frame_id),
          frameId2CodeAreaView,
          frameId2FrameView
        );

        // rerender stack contents and heap elements
        if (prevStepIndex === -1) {
          step.stack_frames
            .map(frame => frame.frame_id)
            .forEach(frameId => {
              frameId2FrameView
                .get(frameId)
                ?.rerender(
                  step.stack_frames.find(x => x.frame_id === frameId)!
                );
            });

          Object.keys(step.heap).forEach(heapElementId => {
            heapContainer.appendChild(heapId2View.get(heapElementId)?.node()!);
            heapId2View.get(heapElementId)?.rerender(step.heap[heapElementId]);
          });
        } else {
          const stackDiff = diffStack(prevStep, step);
          stackDiff.created.concat(stackDiff.updated).forEach(frameId => {
            frameId2FrameView
              .get(frameId)
              ?.rerender(step.stack_frames.find(x => x.frame_id === frameId)!);
          });

          const heapDiff = diffHeap(prevStep, step);
          heapDiff.destroyed.forEach(heapElementId =>
            heapId2View.get(heapElementId)?.node().remove()
          );
          heapDiff.created.forEach(heapElementId =>
            heapContainer.appendChild(heapId2View.get(heapElementId)?.node()!)
          );
          heapDiff.created
            .concat(heapDiff.updated)
            .forEach(heapElementId =>
              heapId2View.get(heapElementId)?.rerender(step.heap[heapElementId])
            );
        }

        // calculate heap element coordinates

        const rows = stepHeapRows[stepIndex];
        const currentViews = rows.map(x => heapId2View.get(x)!);

        const connections = calculateConnections(
          step,
          heapId2View,
          frameId2FrameView
        );

        const heapCoordinates = calculateHeapCoordinates(
          currentViews,
          connections,
          20,
          20
        );

        currentViews.forEach(heapElementView => {
          // if view has been dragged by user, use that position, otherwise use position
          // calculated by the layouter
          const draggedPosition = draggedView2position.get(heapElementView);
          const calculatedPosition = heapCoordinates.get(heapElementView);
          const position =
            draggedPosition !== undefined
              ? draggedPosition
              : calculatedPosition!;

          heapElementView.x(position[0]);
          heapElementView.y(position[1]);
        });

        connectionRouter.rerender(connections);

        consoleView.rerender(step.stdout);
      }

      let index = -1;

      return {
        advanceStep() {
          if (index === trace.steps.length - 1) return;
          renderStep(index + 1, index);
          index++;
        },

        backwardStep() {
          if (index <= 0) return;
          renderStep(index - 1, index);
          index--;
        },

        destroy() {
          contextContainer.innerHTML = "";
          heapContainer.innerHTML = "";
          consoleWindowContainer.innerHTML = "";
          jsplumbInstance.destroy();
        },

        isFirstStep() {
          return index === 0;
        },

        isLastStep() {
          return index === trace.steps.length - 1;
        }
      };
    }
  };
});
