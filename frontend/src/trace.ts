/**
 * Converts pythontutor trace format to our trace format
 */

/**
 * TODO: catch potential conversion errors. One possible reason for error is that
 * this code currently does not explicitly support all of pythontutor's
 * features (like closures)
 *
 * To learn how pythontutor processes the debugger output and encodes JS entities,
 * see file `v4-cokapi/backends/javascript/jslogger.js` in the pythontutor repo
 */

/**
 * TODO: Type the pythontutor trace format and substitute these typings for the `any`
 * types in this file
 */

import TraceModule, {
  HeapElement,
  HeapElementId,
  Identifier,
  StackFrame,
  Stdout,
  Step,
  Trace,
  Value
} from "../types/trace";

define([], function (): TraceModule {
  function convertTrace(pyTutorTrace: any): Trace {
    const { trace: pySteps, code } = pyTutorTrace;

    return {
      programCode: code,
      steps: pySteps.map((pyStep: any, index: any) => {
        const {
          // stdout: pyStdout,
          func_name: function_name,
          stack_to_render: pyStack,
          globals: pyGlobals,
          ordered_globals,
          line,
          col,
          event,
          heap: pyHeap,
          exception_msg: pyExceptionMsg
        } = pyStep;

        const stack_frames: StackFrame[] = pyStack.map((pyFrame: any) => {
          const {
            func_name: function_name,
            frame_id,
            ordered_varnames,
            encoded_locals: pyLocals
          } = pyFrame;

          const ordered_locals = ordered_varnames.filter(
            (x: any) => x !== "__return__"
          );

          const locals: Record<Identifier, Value> = Object.keys(pyLocals)
            .filter(x => x !== "__return__")
            .map<[string, Value]>(pyLocal => [
              pyLocal,
              convertPyValueToValue(pyLocals[pyLocal])
            ])
            .reduce((prev, [key, value]) => {
              prev[key] = value;
              return prev;
            }, {} as Record<Identifier, Value>);

          const return_value = pyLocals.hasOwnProperty("__return__")
            ? convertPyValueToValue(pyLocals["__return__"])
            : undefined;

          const result: StackFrame = {
            function_name,
            frame_id,
            ordered_locals,
            locals,
            return_value
          };

          return result;
        });

        const globals: Record<Identifier, Value> = Object.keys(pyGlobals)
          .map<[string, Value]>(pyGlobal => [
            pyGlobal,
            convertPyValueToValue(pyGlobals[pyGlobal])
          ])
          .reduce((prev, [key, value]) => {
            prev[key] = value;
            return prev;
          }, {} as Record<Identifier, Value>);

        stack_frames.unshift({
          frame_id: 0,
          function_name: "Global frame",
          locals: globals,
          ordered_locals: ordered_globals
        });

        const heap: Record<HeapElementId, HeapElement> = Object.keys(pyHeap)
          .map<[string, HeapElement]>(pyHeapElemId => [
            pyHeapElemId,
            convertPyHeapElementToHeapElement(
              pyHeap[pyHeapElemId],
              pyHeapElemId
            )
          ])
          .reduce((prev, [key, value]) => {
            prev[key] = value;
            return prev;
          }, {} as Record<HeapElementId, HeapElement>);

        const stdout: Stdout = pySteps
          .slice(0, index + 1) // only process up to the current step
          .reduce(
            (
              prev: Stdout,
              { stdout: pyContent }: { stdout: string },
              stepIndex: number
            ) => {
              // edge case: at the 1st step, prevStepLine===undefined
              const prevStepLine = pySteps[stepIndex - 1]?.line;

              if (prev.length === 0) {
                // there was no output before.
                // Now, either there still is no output,
                // or new output has been generated
                return pyContent === ""
                  ? []
                  : // -1 to remove the trailing \n
                    [{ line: prevStepLine, content: pyContent.slice(0, -1) }];
              }

              const prevContentLength = prev.reduce(
                // +1 because the pythontutor output always has an additional \n
                // at each line
                (prev, { content }) => prev + content.length + 1,
                0
              );
              // -1 to remove the trailing \n
              const newContent = pyContent.slice(prevContentLength, -1);

              // there is no new output at this step
              if (newContent === "") {
                return [...prev];
              }

              // there IS new output at this step
              return [...prev, { line: prevStepLine, content: newContent }];
            },
            []
          );

        const step: Step = {
          stdout,
          function_name,
          stack_frames,
          line,
          col,
          event,
          heap,
          exception_message: event === "exception" ? pyExceptionMsg : undefined
        };

        return step;
      })
    };
  }

  function convertPyValueToValue(pyValue: any): Value {
    if (typeof pyValue === "number") {
      return { kind: "number", value: pyValue };
    }

    if (typeof pyValue === "string") {
      return { kind: "string", value: pyValue };
    }

    const [pyKind] = pyValue;

    if (pyKind === "SPECIAL_FLOAT") {
      const [, pyFloatValue] = pyValue;

      if (pyFloatValue === "NaN") {
        return { kind: "NaN" };
      }

      if (pyFloatValue === "Infinity") {
        return { kind: "Infinity" };
      }

      if (pyFloatValue === "-Infinity") {
        return { kind: "-Infinity" };
      }
    }

    if (pyKind === "JS_SPECIAL_VAL") {
      const [, pyFloatValue] = pyValue;

      if (pyFloatValue === "true") {
        return { kind: "boolean", value: true };
      }

      if (pyFloatValue === "false") {
        return { kind: "boolean", value: false };
      }

      if (pyFloatValue === "null") {
        return { kind: "null" };
      }

      if (pyFloatValue === "undefined") {
        return { kind: "undefined" };
      }
    }

    if (pyKind === "REF") {
      const [, pyFloatValue] = pyValue;

      return { kind: "pointer", ref: pyFloatValue };
    }

    /**
     * Besides the above handled cases, pythontutor also allows "JS_SPECIAL_VAL" for symbols
     */
    throw new Error("We do not currently handle Symbols");
  }

  function convertPyHeapElementToHeapElement(
    pyHeapElement: any,
    id: string
  ): HeapElement {
    const [pyKind] = pyHeapElement;

    if (pyKind === "JS_FUNCTION") {
      const [, name, code] = pyHeapElement;
      return { kind: "function", name, code, id };
    }

    if (pyKind === "LIST") {
      const [, ...pyValues] = pyHeapElement;
      return {
        kind: "array",
        values: pyValues.map((pyValue: any) => convertPyValueToValue(pyValue)),
        id
      };
    }

    if (pyKind === "INSTANCE") {
      const [, , ...pyKeyValuePairs] = pyHeapElement;

      return {
        kind: "object",
        id,
        entries: pyKeyValuePairs.map(([pyKey, pyValue]: [any, any]) => ({
          key: pyKey,
          value: convertPyValueToValue(pyValue)
        }))
      };
    }

    /**
     * Besides the above handled cases, pythontutor also allows "SET" and "DICT"
     */
    throw new Error("We do not currently handle SET and DICT");
  }

  return {
    convertTrace
  };
});
