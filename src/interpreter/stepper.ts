/**
 * Knows which kind of nodes our interpreter should skip when it is in "micro step" mode
 * or "macro step" mode. Only steps forward.
 */

import { Interpreter } from "JS-Interpreter";
import type { Node } from "JS-Interpreter-ast";
import { deserialize, serialize } from "JS-Interpreter-serializer";
import { isStateType } from "./fraser";

const microStepSkipOwn: Node["type"][] = [
  "Program",
  "EmptyStatement",
  "ExpressionStatement"
];

const microStepSkipChildren: Node["type"][] = [];

const macroStepSkipOwn: Node["type"][] = [
  ...microStepSkipOwn,

  //statements
  "BlockStatement",
  "IfStatement",
  "LabeledStatement",
  "WithStatement",
  "SwitchStatement",
  "TryStatement",
  "WhileStatement",
  "DoWhileStatement",
  "ForStatement",
  "ForInStatement"
];

const macroStepSkipChildren: Node["type"][] = [
  ...microStepSkipChildren,

  // statements
  "ReturnStatement",
  "ThrowStatement",
  "VariableDeclaration",

  // expressions
  "ThisExpression",
  "ArrayExpression",
  "ObjectExpression",
  "SequenceExpression",
  "UnaryExpression",
  "BinaryExpression",
  "AssignmentExpression",
  "UpdateExpression",
  "LogicalExpression",
  "ConditionalExpression",
  "NewExpression",
  "CallExpression",
  "MemberExpression"
];

interface Anchor {
  state: Interpreter.State;
  mode: "micro" | "macro";
  depth: number;

  /**
   * Index into fraser's interpreter's state stack.
   * Useful to clone a Stepper.
   */
  index: number;
}

interface StateStackTop {
  depth: number;
  scopeId: number;
}

export type SerializedInterpreter = string;
export type SerializedInternalState = [
  StateStackTop,
  StepKind,
  Omit<Anchor, "state">[]
];

export type StepKind =
  | { kind: "micro" }
  | { kind: "macro" }
  | { kind: "end" }
  | { kind: "uncaught exception"; exception: unknown };

export type StepperInjectedFunction = (node: Node, ...rest: any[]) => any;

export class Stepper {
  /**
   * Previous AST nodes that commanded us
   * to "skip their children"
   */
  private anchorStack: Anchor[] = [];

  /**
   * Used to discern when Fraser's interpreter has
   * backtracked up the stateStack
   */
  private prevStateStackTop: StateStackTop = { depth: -1, scopeId: -1 };

  /**
   * Whether the current step is a micro or macro step.
   * Is null while the stepper is not started.
   */
  private _stepKind: StepKind | null = null;

  private interpreter: Interpreter;

  get stepKind() {
    if (this._stepKind === null) {
      throw new Error("get stepKind: is null");
    }

    return this._stepKind;
  }

  private setStepKindAndReturn(stepKind: StepKind): StepKind {
    this._stepKind = stepKind;
    return stepKind;
  }

  /**
   * Constructs a Stepper from code
   */
  constructor(code: string, functions?: [string, StepperInjectedFunction][]);
  /**
   * Constructs a Stepper from a serialized snapshot
   */
  constructor(
    serializedInternalState: SerializedInternalState,
    serializedInterpreter: SerializedInterpreter,
    functions?: [string, StepperInjectedFunction][]
  );
  constructor(
    codeOrSerializedInternalState: string | SerializedInternalState,
    serializedInterpreterOrFunctions?:
      | SerializedInterpreter
      | [string, StepperInjectedFunction][],
    functions?: [string, StepperInjectedFunction][]
  ) {
    // first overload
    if (typeof codeOrSerializedInternalState === "string") {
      const code = codeOrSerializedInternalState;
      const functions = (serializedInterpreterOrFunctions || []) as [
        string,
        StepperInjectedFunction
      ][];
      this.interpreter = new Interpreter(code, (interpreter, globalObject) =>
        this.injectFunctions(functions, interpreter, globalObject)
      );
      return;
    }

    // second overload
    const serializedInternalState = codeOrSerializedInternalState;
    const serializedInterpreter =
      serializedInterpreterOrFunctions as SerializedInterpreter;
    this.interpreter = new Interpreter("", (interpreter, globalObject) =>
      this.injectFunctions(functions || [], interpreter, globalObject)
    );
    deserialize(JSON.parse(serializedInterpreter!), this.interpreter);
    this.prevStateStackTop = serializedInternalState[0];
    this._stepKind = serializedInternalState[1];
    this.anchorStack = serializedInternalState[2].map(x => ({
      depth: x.depth,
      index: x.index,
      mode: x.mode,
      state: this.getStateStack()[x.index]
    }));
  }

  get globalScope() {
    return this.interpreter.globalScope;
  }

  get ast() {
    // fix: do not use `interpreter.ast` because it is a Program node
    // where `node.body` is an empty array
    return this.getStateStack()[0].node;
  }

  private injectFunctions(
    functions: [string, StepperInjectedFunction][],
    interpreter: Interpreter,
    globalObject: Interpreter.Object
  ) {
    functions.forEach(([name, fn]) => {
      if (!name) {
        throw new Error("injectFunctions: functions must have a name");
      }
      const pseudoFn = interpreter.nativeToPseudo((...args: any[]) =>
        // call with current node and forwarded arguments
        fn(this.getStateStack().slice(-1)[0].node, ...args)
      );
      interpreter.setProperty(globalObject, name, pseudoFn);
    });
  }

  /**
   * Advances the interpreter until the next micro step or interpreted
   * uncaught exception.
   *
   * @throws If a **real** exception happens, this method WILL THROW.
   *
   * @return "macro" if the next step is a macro step (which implies it is a micro
   * step too). "micro" if the next step is a micro step but not a macro step. "end"
   * if the program finished. "uncaught exception" if the interpreted code threw an
   * exception that it did not handle.
   */
  step(): StepKind {
    while (true) {
      try {
        const hasMore = this.interpreter.step();
        if (!hasMore) return this.setStepKindAndReturn({ kind: "end" });
      } catch (err) {
        // we could try to catch the exception inside the interpreter
        // (with a wrapper to FraserInterpreter.prototype.throwException),
        // doing so would allow us to see exactly at which AST node the
        // exception happened, before the interpreter unwinds the stack
        // (which discards this information). In practice, it is easier
        // to let Fraser's interpreter unwind and throw, then catch
        // here when it is already too late.

        // real exception
        if (this.interpreter.value === undefined) {
          throw err;
        }

        // interpreted exception that the interpreted code
        // did not handle
        else {
          return this.setStepKindAndReturn({
            kind: "uncaught exception",
            exception: err
          });
        }
      }

      const stateStack = this.getStateStack();
      if (stateStack.length === 0) {
        throw new Error("step: interpreter state stack is empty");
      }
      const state = stateStack[stateStack.length - 1];

      // always skip a state which belongs to polyfill code
      // (like array.map, array.push, etc.)
      if (state.node.loc.source === "polyfills") {
        continue;
      }

      // If this is:
      // - the last step of a ReturnStatement or ThrowStatement
      // - the resuming step after winding the stack frame (in ES5 without block-
      //   scoped commands `catch` and `with`, this only happens when returning from a function call)
      // Then want to keep it (even though it certainly is a backtracking step, handled below)
      const isLastReturnStatementStep =
        isStateType(state, "ReturnStatement") && state.done_;
      const isLastThrowStatementStep =
        isStateType(state, "ThrowStatement") && state.done_;
      const isResumingStep =
        stateStack.length <= this.prevStateStackTop.depth &&
        state.scope.object.__custom_id_property__ !==
          this.prevStateStackTop.scopeId;
      if (
        isLastReturnStatementStep ||
        isLastThrowStatementStep ||
        isResumingStep
      ) {
        this.prevStateStackTop = {
          depth: stateStack.length,
          scopeId: state.scope.object.__custom_id_property__
        };
        return this.setStepKindAndReturn({ kind: "macro" });
      }

      // if we are backtracking and it is not a case handled above, we should
      // skip this state (because we are back to it after having already
      // visited one or more of its children)
      if (stateStack.length <= this.prevStateStackTop.depth) {
        this.prevStateStackTop = {
          depth: stateStack.length,
          scopeId: state.scope.object.__custom_id_property__
        };
        continue;
      }

      // from here on, we are NOT backtracking

      // chore: update the recorded stateStack top because we won't
      // be using it anymore in this iteration
      this.prevStateStackTop = {
        depth: stateStack.length,
        scopeId: state.scope.object.__custom_id_property__
      };

      // chore: last time, we could have been in the middle of
      // skipping the children of a node. Synchronize
      // the anchorStack in case the stateStack has
      // backtracked over our anchorStack nodes.
      while (
        this.anchorStack.length > 0 &&
        // the stateStack no longer includes the latest anchorStack state
        !stateStack.includes(
          this.anchorStack[this.anchorStack.length - 1].state
        )
      ) {
        this.anchorStack.pop();
      }

      // now the rules get somewhat trickier because we are handling
      // both the micro and macro steps at once.
      // Use a variable to keep the first decision
      // we ever make
      let shouldSkipMacro = false;

      // if there is an anchor telling us to skip its children,
      // then we may need to skip this state (if it is a descendant of the anchor
      // and is inside its range)
      if (this.anchorStack.length > 0) {
        const anchor = this.anchorStack[this.anchorStack.length - 1];
        const isDescendant = stateStack.length > anchor.depth;
        const isInsideRange =
          state.node.start >= anchor.state.node.start &&
          state.node.end <= anchor.state.node.end;
        if (isDescendant && isInsideRange && anchor.mode === "micro") {
          continue;
        }
        if (isDescendant && isInsideRange && anchor.mode === "macro") {
          // we cannot skip now, because even though macro mode
          // would have us skip this state, in micro mode
          // we may still want to keep it
          shouldSkipMacro = true;
        }
      }

      // chore: if this state commands us to skip its children,
      // record this in the anchorStack. Do this AFTER the
      // "skip node as a child" handled above (because if we
      // are skipping a node because it is a child of the anchor,
      // then this node cannot command us to skip its children, and anyway
      // the anchor is enough to tell us to skip all descendants including
      // "grandchildren" and so on), but
      // before deciding whether or not we should skip this "own" state,
      // because even if it is a "skip own"-type node, it can still
      // command us to skip its children too
      // (in the worst case, it won't hurt, because the
      // next iteration will re-synchronize the anchorStack
      // as was done above)
      if (microStepSkipChildren.includes(state.node.type)) {
        this.anchorStack.push({
          state,
          mode: "micro",
          depth: stateStack.length,
          index: stateStack.length - 1
        });
      } else if (macroStepSkipChildren.includes(state.node.type)) {
        this.anchorStack.push({
          state,
          mode: "macro",
          depth: stateStack.length,
          index: stateStack.length - 1
        });
      }

      if (!macroStepSkipOwn.includes(state.node.type) && !shouldSkipMacro) {
        return this.setStepKindAndReturn({ kind: "macro" });
      }
      if (!microStepSkipOwn.includes(state.node.type)) {
        return this.setStepKindAndReturn({ kind: "micro" });
      }
      // skipping...
    }
  }

  getStateStack() {
    return this.interpreter.getStateStack();
    // fix: filter out those states which correspond to the "internals"
    // of polyfill code, like Array.prototype.map, Array.prototype.push, etc.
    // return this.interpreter
    //   .getStateStack()
    //   .filter(state => state.node.loc.source !== "polyfills");
  }

  serialize(): [SerializedInterpreter, SerializedInternalState] {
    if (this._stepKind === null) {
      throw new Error(
        "serialize: cannot serialize because stepper is not started"
      );
    }

    return [
      JSON.stringify(serialize(this.interpreter)),
      [
        this.prevStateStackTop,
        this._stepKind,
        this.anchorStack.map(x => ({
          depth: x.depth,
          index: x.index,
          mode: x.mode
          // omit `state`
        }))
      ]
    ];
  }
}
