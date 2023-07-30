import type {
  Event,
  HeapElement,
  HeapElementId,
  StackFrame,
  Stdout,
  Step,
  Value
} from "../trace/types";

import { Interpreter as FraserInterpreter } from "JS-Interpreter";

import type { Node } from "JS-Interpreter-ast";
import { isPrimitive } from "../utils";
import { collectLocals } from "./ast";
import { ConsoleCollector } from "./console-collector";
import { DiffStack } from "./diff-stack";
import {
  fraserObjectToTraceHeapElement,
  fraserValueToTraceValue,
  getVariableValue,
  isStateType,
  unboxPrimitive
} from "./fraser";
import {
  Stepper,
  type SerializedInternalState,
  type StepKind,
  type StepperInjectedFunction
} from "./stepper";

// disable regexps
FraserInterpreter.prototype.REGEXP_MODE = 0;

// Modify the object constructor to keep track of object IDs
let object_id = 0;
const originalObjectConstructor = FraserInterpreter.Object;
// @ts-expect-error
//   ```
//   Type '(this: FraserInterpreter.Object) => void'
//   is not assignable to type 'typeof Object'.
//   ```
// This happens because the implementation of Object
// is based on a constructor function, we just wrap
// this function.
FraserInterpreter.Object = function (
  this: FraserInterpreter.Object,
  proto: unknown
) {
  originalObjectConstructor.apply(this, [proto]);
  this.__custom_id_property__ = object_id++;
};

// Modify the Scope constructor to make all scopes
// automatically be in strict mode
const originalScopeConstructor = FraserInterpreter.Scope;
// @ts-expect-error
//   ```
//   Type '(this: FraserInterpreter.Scope) => void'
//   is not assignable to type 'typeof Scope'.
//   ```
// This happens because the implementation of Object
// is based on a constructor function, we just wrap
// this function.
FraserInterpreter.Scope = function (
  this: FraserInterpreter.Scope,
  parentScope: FraserInterpreter.Scope,
  strict: boolean,
  object: FraserInterpreter.Object
) {
  originalScopeConstructor.call(this, parentScope, true, object);
};

/**
 * An interpreted-code exception that the interpreted code did not handle
 * (this is NOT a real exception). If there is an exception, it will be
 * the last state of the interpreter
 */
type ExceptionState = null | { exception: unknown };

type InterpreterInjectedFunction = (
  log: (content: string) => void,
  ...rest: any[]
) => any;

/**
 * For internal use by the Interpreter
 */
type ExecutionState = null | "started" | "finished";

/**
 * For reporting to the client of the Interpreter
 */
type ExecutionStatus =
  | { kind: "started" }
  | { kind: "finished ok" }
  | { kind: "finished exception"; exception: unknown };

export class Interpreter {
  /**
   * Underlying components
   */
  private sourceCode: string;
  private stepper: Stepper;

  /**
   * Current state
   */
  private exceptionState: ExceptionState = null;
  private executionState: ExecutionState = null;

  /**
   * Previous serialized states
   */
  private interpreterDiffStack: DiffStack = new DiffStack();
  private stepperInternalStateStack: SerializedInternalState[] = [];
  private exceptionStateStack: ExceptionState[] = [];
  private executionStateStack: ExecutionState[] = [];

  /**
   * Utility to collect console logs
   */
  private consoleCollector: ConsoleCollector = new ConsoleCollector();

  /**
   * @throws if an exception happens inside the Stepper when taking
   * the first code step
   */
  constructor(
    code: string,
    private functionsToInject?: [string, InterpreterInjectedFunction][]
  ) {
    this.sourceCode = code;
    this.stepper = new Stepper(
      code,
      this.wrapInjectedFunctions(functionsToInject)
    );

    // take the first step into the program (to skip the Program node,
    // which is useless anyway)
    this.stepForward("micro");
  }

  private wrapInjectedFunctions(
    functions?: [string, InterpreterInjectedFunction][]
  ): [string, StepperInjectedFunction][] {
    const self = this;
    return (
      functions?.map(([name, fn]) => {
        if (!name) {
          throw new Error("wrapInjectedFunctions: functions must have a name");
        }
        const wrappedFunction = // signature offered by the stepper: Node and args passed from the interpreted code
          function (node: Node, ...rest: any[]) {
            // signature expected by the client of the Interpreter: first arg is log,
            // others are the args passed from the interpreted code
            return fn(
              content =>
                self.consoleCollector.log(content, node.loc.start.line),
              ...rest
            );
          };
        // fix: forward the function name
        Object.defineProperty(wrappedFunction, "name", {
          value: fn.name,
          configurable: true
        });
        return [name, wrappedFunction];
      }) || []
    );
  }

  /**
   * @throws
   */
  stepForward(mode: "micro" | "macro"): void {
    if (this.isLastStep()) {
      throw new Error("stepForward: execution already ended");
    }

    // if is started already, store the current state before
    // stepping into the next state
    if (this.executionState === "started") {
      this.saveState();
    }

    // open a new collector bin to store the stdout of the new step
    this.consoleCollector.newCollector();

    this.executionState = "started";
    this.exceptionState = null;

    let stepKind: StepKind = this.stepper.step();
    while (mode === "macro" && stepKind.kind === "micro") {
      this.saveState();
      this.consoleCollector.newCollector();
      stepKind = this.stepper.step();
    }

    if (stepKind.kind === "end") {
      this.executionState = "finished";
      return;
    }

    if (stepKind.kind === "uncaught exception") {
      this.executionState = "finished";
      this.exceptionState = stepKind;
      return;
    }
  }

  stepBackward(mode: "micro" | "macro"): void {
    if (this.isFirstStep()) {
      throw new Error("stepBackward: there is no previous state");
    }

    do {
      this.consoleCollector.popCollector();
      const serializedInterpreter = this.interpreterDiffStack.remove();
      const stepperInternalState = this.stepperInternalStateStack.pop()!;
      this.stepper = new Stepper(
        stepperInternalState,
        serializedInterpreter,
        this.wrapInjectedFunctions(this.functionsToInject)
      );
      this.exceptionState = this.exceptionStateStack.pop()!;
      this.executionState = this.executionStateStack.pop()!;
    } while (
      mode === "macro" &&
      !this.interpreterDiffStack.isEmpty() &&
      this.stepper.stepKind.kind !== "macro"
    );
  }

  collectState(): Step {
    let stdout: Stdout = this.consoleCollector.getAll();
    let line_start: number;
    let line_end: number;
    let col_start: number;
    let col_end: number;
    let function_name: string;
    let event: Event;
    let stack_frames: StackFrame[] = [];
    let heap: Record<HeapElementId, HeapElement> = {};
    let exception_message: string | undefined;

    const stateStack = this.stepper.getStateStack();
    const currentState = stateStack[stateStack.length - 1];

    line_start = currentState.node.loc.start.line;
    line_end = currentState.node.loc.end.line;
    col_start = currentState.node.loc.start.column;
    col_end = currentState.node.loc.end.column;

    // ignore "call" event, treat as "step_line" because there is no
    // visual difference in the layouter anyway, and it is hard to manage
    // the state of fraser's interpreter's call/new expression.
    event =
      isStateType(currentState, "ThrowStatement") && currentState.done_
        ? "exception"
        : this.exceptionState !== null
        ? "exception"
        : isStateType(currentState, "ReturnStatement") && currentState.done_
        ? "return"
        : "step_line";

    exception_message =
      isStateType(currentState, "ThrowStatement") && currentState.done_
        ? errorToString(currentState.value)
        : this.exceptionState !== null
        ? errorToString(this.exceptionState.exception)
        : undefined;

    // collect variables in the stack, put inside `heap` and `stack_frames`
    // FIXME: this logic is incorrect in case of: [1] catch clause,
    // [2] with statement. These statements create a new scope. This is
    // not a problem right now, because we forbid try-catch and with.
    for (let i = 0; i < stateStack.length; i++) {
      // Skip consecutive appearances of the same scope (in multiple AST nodes).
      // Keep the last consecutive occurrence of a function scope (because it
      // may be a return statement, and in this case we need to capture the return value
      const state = stateStack[i];

      // skip scope if next scope is from the same function
      if (
        i < stateStack.length - 1 &&
        stateStack[i + 1].scope === state.scope
      ) {
        continue;
      }

      // skip scope if it belongs to polyfill code (like array.map, array.push, etc.)
      if (state.node.loc.source === "polyfills") {
        continue;
      }

      stack_frames.push(
        this.collectStackFrameWithLocals(heap, state, stateStack)
      );
    }

    function_name = stack_frames[stack_frames.length - 1].function_name;

    return {
      stdout,
      line_start,
      line_end,
      col_start,
      col_end,
      function_name,
      event,
      stack_frames,
      heap,
      exception_message
    };
  }

  getExecutionStatus(): ExecutionStatus {
    return this.executionState === "started"
      ? { kind: "started" }
      : this.exceptionState === null
      ? { kind: "finished ok" }
      : {
          kind: "finished exception",
          exception: this.exceptionState.exception
        };
  }

  isFirstStep(): boolean {
    return this.interpreterDiffStack.isEmpty();
  }

  isLastStep(): boolean {
    return this.executionState === "finished";
  }

  /**
   * Populates `heap` and returns the stack_frame
   */
  private collectStackFrameWithLocals(
    heap: Record<HeapElementId, HeapElement>,
    state: FraserInterpreter.State,
    stateStack: FraserInterpreter.State[]
  ): StackFrame {
    const [function_name, ordered_locals, functionNode] =
      this.collectFrameNameLocalsAndNode(state, stateStack);
    const frame_id = state.scope.object.__custom_id_property__;
    const locals: Record<HeapElementId, Value> = Object.fromEntries(
      ordered_locals.map(localName => {
        const value = getVariableValue(localName, state.scope);
        if (!isPrimitive(value)) {
          this.recurseBuildHeap(heap, value);
        }
        return [localName, fraserValueToTraceValue(value)];
      })
    );

    let return_value: Value | undefined = undefined;
    if (isStateType(state, "ReturnStatement") && "value" in state) {
      const stateValue = unboxPrimitive(state.value);

      if (!isPrimitive(stateValue)) {
        this.recurseBuildHeap(heap, stateValue);
      }

      return_value = fraserValueToTraceValue(stateValue);
    }

    return {
      function_name,
      function_code: this.sourceCode.slice(
        functionNode.start,
        functionNode.end
      ),
      code_line_start: functionNode.loc.start.line,
      code_col_start: functionNode.loc.start.column,
      code_line_end: functionNode.loc.end.line,
      code_col_end: functionNode.loc.end.column,
      state_line_start: state.node.loc.start.line,
      state_col_start: state.node.loc.start.column,
      state_line_end: state.node.loc.end.line,
      state_col_end: state.node.loc.end.column,
      frame_id,
      locals,
      ordered_locals,
      return_value
    };
  }

  private recurseBuildHeap(
    heap: Record<HeapElementId, HeapElement>,
    value: Exclude<
      FraserInterpreter.ValueObject,
      FraserInterpreter.BoxedPrimitive
    >
  ) {
    if (heap[value.__custom_id_property__]) return;

    heap[value.__custom_id_property__] = fraserObjectToTraceHeapElement(
      value,
      this.sourceCode
    );

    for (const propertyName in value.properties) {
      const propertyValue = unboxPrimitive(value.properties[propertyName]);
      if (!isPrimitive(propertyValue)) {
        this.recurseBuildHeap(heap, propertyValue);
      }
    }
  }

  /**
   * Given a state, finds the root AST node of the scope and extracts
   * its information
   */
  private collectFrameNameLocalsAndNode(
    state: FraserInterpreter.State,
    stateStack: FraserInterpreter.State[]
  ): [string, string[], Node] {
    // FIXME: this code won't work if the interpreted code includes either
    // [1] a `with` statement, [2] a `catch` clause, [3] a getter/setter.
    // This is not a problem now because we forbid using with/try-catch/getter/setter
    // in the interpreted code anyway.

    if (state.scope === this.stepper.globalScope) {
      const functionNode = this.stepper.ast;
      return ["<global>", collectLocals(functionNode), functionNode];
    }

    // find the call/new expression that called the function (i.e. the latest
    // call/new expression)
    const previousStates = stateStack.slice(
      0,
      stateStack.findIndex(x => x.scope === state.scope)
    );
    const previousCallExpressions = previousStates.filter(
      (
        x
      ): x is
        | FraserInterpreter.CallExpressionState
        | FraserInterpreter.NewExpressionState =>
        isStateType(x, "CallExpression") || isStateType(x, "NewExpression")
    );

    // should never happen, given the assumptions stated at the beginning
    if (previousCallExpressions.length === 0) {
      throw new Error(
        "collectFrameNameLocalsAndNode: there were no previous call/new expressions"
      );
    }

    const functionObject =
      previousCallExpressions[previousCallExpressions.length - 1].func_;

    // should never happen
    if (!functionObject) {
      throw new Error(
        "collectFrameNameLocalsAndNode: previous call/new expression state did not have a function object"
      );
    }

    const functionNode = functionObject.node;

    // FIXME: maybe this does not work for `eval`, I am not sure.
    // This is not a problem now, because we forbid eval anyway.
    if (!functionNode) {
      throw new Error(
        "collectFrameNameLocalsAndNode: function node is falsish"
      );
    }

    const functionName = (functionObject.properties.name as string) || "<anon>";

    const shouldRenderThis =
      functionObject.properties.this === this.stepper.globalScope.object
        ? false
        : true;

    const functionLocals = [
      "this",
      ...functionNode.params.map(param => param.name),
      ...collectLocals(functionNode.body)
    ];

    return [functionName, functionLocals, functionNode];
  }

  private saveState() {
    const stepKind = this.stepper.stepKind.kind;
    if (stepKind !== "micro" && stepKind !== "macro") {
      throw new Error("saveState: tried to save an end or exception state");
    }

    const [serializedInterpreter, serializedStepperState] =
      this.stepper.serialize();
    this.interpreterDiffStack.append(serializedInterpreter);
    this.stepperInternalStateStack.push(serializedStepperState);
    this.exceptionStateStack.push(this.exceptionState);
    this.executionStateStack.push(this.executionState);
  }
}

/**
 * Stringifies an interpreted Error (i.e. an error of the interpreted code)
 */
export function errorToString(error: unknown): string {
  if (error === null || typeof error !== "object") {
    return String(error);
  }

  let result = "";

  result += "name" in error ? `${error.name}: ` : "<Unknown Error>: ";
  result += "message" in error ? error.message : "<no message>";
  result += "stack" in error ? `\n${error.stack}` : "\n<no stack>";

  return result;
}
