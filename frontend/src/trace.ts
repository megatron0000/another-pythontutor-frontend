/**
 * Converts pythontutor trace format to our trace format
 */

/**
 * TODO: catch potential conversion errors. One possible reason for error is that
 * this code currently does not explicitly support all of pythontutor's
 * features (like closures)
 *
 * Too learn how pythontutor processes the debugger output and encodes JS entities,
 * see file `v4-cokapi/backends/javascript/jslogger.js` in the pythontutor repo
 */

/* eslint-disable import/no-amd, no-undef */

define([], function () {
  /**
   * @return {Trace}
   */
  function convertTrace(pyTutorTrace) {
    const { trace: pySteps } = pyTutorTrace;

    return pySteps.map((pyStep) => {
      const {
        stdout,
        func_name: function_name,
        stack_to_render: pyStack,
        globals: pyGlobals,
        ordered_globals,
        line,
        event,
        heap: pyHeap
      } = pyStep;

      /** @type {StackFrame[]} */
      const stack_frames = pyStack.map((pyFrame) => {
        const {
          func_name: function_name,
          frame_id,
          ordered_varnames: ordered_locals,
          encoded_locals: pyLocals
        } = pyFrame;

        /** @type {Record<Identifier, Value>} */
        const locals = Object.keys(pyLocals)
          .filter((x) => x !== "__return__")
          .map((pyLocal) => [pyLocal, convertPyValueToValue(pyLocals[pyLocal])])
          .reduce((prev, [key, value]) => {
            prev[key] = value;
            return prev;
          }, {});

        /** @type {StackFrame} */
        const result = {
          function_name,
          frame_id,
          ordered_locals,
          locals
        };

        return result;
      });

      /** @type {Record<Identifier, Value>} */
      const globals = Object.keys(pyGlobals)
        .map((pyGlobal) => [
          pyGlobal,
          convertPyValueToValue(pyGlobals[pyGlobal])
        ])
        .reduce((prev, [key, value]) => {
          prev[key] = value;
          return prev;
        }, {});

      /** @type {Record<HeapElementId, HeapElement>} */
      const heap = Object.keys(pyHeap)
        .map((pyHeapElemId) => [
          pyHeapElemId,
          convertPyHeapElementToHeapElement(pyHeap[pyHeapElemId], pyHeapElemId)
        ])
        .reduce((prev, [key, value]) => {
          prev[key] = value;
          return prev;
        }, {});

      const return_value =
        pyStack.length > 0 &&
        pyStack[pyStack.length - 1].encoded_locals.hasOwnProperty("__return__")
          ? convertPyValueToValue(
              pyStack[pyStack.length - 1].encoded_locals["__return__"]
            )
          : undefined;

      /** @type {Step} */
      const step = {
        stdout,
        function_name,
        stack_frames,
        globals,
        ordered_globals,
        line,
        event,
        heap,
        return_value
      };

      return step;
    });
  }

  /**
   * @return {Value}
   */
  function convertPyValueToValue(pyValue) {
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

  /**
   * @param {string} id
   * @return {HeapElement}
   */
  function convertPyHeapElementToHeapElement(pyHeapElement, id) {
    const [pyKind] = pyHeapElement;

    if (pyKind === "JS_FUNCTION") {
      const [, name, code] = pyHeapElement;
      return { kind: "function", name, code, id };
    }

    if (pyKind === "LIST") {
      const [, ...pyValues] = pyHeapElement;
      return {
        kind: "array",
        values: pyValues.map((pyValue) => convertPyValueToValue(pyValue)),
        id
      };
    }

    if (pyKind === "INSTANCE") {
      const [, , ...pyKeyValuePairs] = pyHeapElement;

      return {
        kind: "object",
        id,
        entries: pyKeyValuePairs.map(([pyKey, pyValue]) => ({
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

  return convertTrace;
});
