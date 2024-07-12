declare module "JS-Interpreter" {
  import type {
    CallExpression,
    EmptyStatement,
    FunctionDeclaration,
    FunctionExpression,
    NewExpression,
    Node,
    Program,
    ReturnStatement,
    ThrowStatement
  } from "JS-Interpreter-ast";

  export class Interpreter {
    constructor(
      code: string,
      externalFunctionInitializer: (
        interpreter: Interpreter,
        globalObject: Interpreter.Object
      ) => void
    );

    /**
     * 0 = disabled
     */
    REGEXP_MODE: 0 | 1 | 2;

    /**
     * Used internally to stop the execution of a step
     * when it generates a (handled) interpreted-code exception
     */
    static STEP_ERROR: unknown;

    readonly globalScope: Interpreter.Scope;
    readonly ast: Program;
    readonly value: unknown;

    getStateStack(): Interpreter.State[];

    getProperty(obj: Interpreter.Object, name: string): Interpreter.Value;

    setProperty(
      obj: Interpreter.Object,
      name: string,
      value: Interpreter.Value
    ): void;

    /**
     * `instanceof` operator for interpreted javascript values
     */
    isa(child: Interpreter.Value, constructor: Interpreter.Object): boolean;

    step(): boolean;

    throwException(errorClass: unknown, message: unknown): void;
    throwException(errorValue: unknown): void;

    nativeToPseudo(nativeObj: unknown): Interpreter.Value;
  }

  export namespace Interpreter {
    export interface BaseState {
      scope: Interpreter.Scope;
    }

    export type State = StateMap[keyof StateMap] | UndocumentedState;

    interface StateMap {
      CallExpressionState: CallExpressionState;
      NewExpressionState: NewExpressionState;
      EmptyStatementState: EmptyStatementState;
      ReturnStatementState: ReturnStatementState;
      ThrowStatementState: ThrowStatementState;
      ProgramState: ProgramState;
    }

    export interface UndocumentedState extends BaseState {
      node: Exclude<Node, StateMap[keyof StateMap]["node"]>;
    }

    export interface BaseCallExpressionState extends BaseState {
      node: CallExpression | NewExpression;

      /**
       * Present when the function object has
       * already been resolved by the interpreter
       */
      func_?: Interpreter.FunctionObject;

      /**
       * true when the function has already
       * been called
       */
      doneExec_?: boolean;
    }

    export interface CallExpressionState extends BaseCallExpressionState {
      node: CallExpression;
    }

    export interface NewExpressionState extends BaseCallExpressionState {
      node: NewExpression;
    }

    export interface ProgramState extends BaseState {
      node: Program;
      done?: boolean;
    }

    export interface EmptyStatementState extends BaseState {
      node: EmptyStatement;
    }

    export interface ReturnStatementState extends BaseState {
      node: ReturnStatement;
      /**
       * true when the value to be returned has already
       * been resolved (will also have `value` if this
       * is the state at the top of the stack)
       */
      done_?: boolean;
      value?: Value;
    }

    export interface ThrowStatementState extends BaseState {
      node: ThrowStatement;
      /**
       * true when the value to be thrown has already been
       * resolved
       */
      done_?: boolean;

      /**
       * present when `done_` is true, represents the error to be thrown
       */
      value?: unknown;
    }

    export class Scope {
      parentScope: Interpreter.Scope | null;
      strict: boolean;
      object: Interpreter.Object;

      constructor(parentScope: Scope, strict: boolean, object: Object);
    }

    export class Object {
      getter: object;
      setter: object;
      properties: Record<string, Value>;
      proto: Object | null;

      /**
       * Not present on the original library, added by us on `interpreter.ts`.
       * Must not clash with any property names used by the simulator
       */
      __custom_id_property__: number;

      constructor(proto: unknown);
    }

    /**
     * A javascript value inside the interpreter
     */
    export type Value =
      | ValueObject
      | boolean
      | number
      | string
      | undefined
      | null;

    export type ValueObject =
      | BoxedObject
      | BoxedPrimitive
      | ArrayObject
      | FunctionObject
      | ObjectObject
      | ErrorObject;

    export type BoxedObject = DateObject | RegexpObject;

    export interface DateObject extends Object {
      data: Date;
    }

    export interface RegexpObject extends Object {
      data: RegExp;
    }

    export interface BoxedPrimitive extends Object {
      data: number | string | boolean;
    }

    export interface ArrayObject extends Object {
      class: "Array";
    }

    export interface FunctionObject extends Object {
      class: "Function";
      parentScope: Scope;
      /**
       * Exists for interpreted functions. Does not exist for `eval` and native function
       * (sync or async)
       */
      node?: FunctionDeclaration | FunctionExpression;
      name: string;
    }

    export interface ObjectObject extends Object {
      class: "Object";
    }

    export interface ErrorObject extends Object {
      class: "Error";
    }
  }
}
