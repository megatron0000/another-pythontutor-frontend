/**
 * We use a trace format that differs slightly from pythontutor,
 * this file defines our trace typings
 */

export interface Trace {
  programCode: string;
  steps: Step[];
}

export interface Step {
  stdout: Stdout;
  line_start: number;
  line_end: number;
  col_start: number;
  col_end: number;
  function_name: string;
  event: Event;
  stack_frames: StackFrame[]; // the first frame is the global scope
  heap: Record<HeapElementId, HeapElement>;
  exception_message?: string; // string only if Step.event === "exception"
}

export type Stdout = { content: string; line: number }[];

export type StackFrameId = number;

export type HeapElementId = string;

export type Identifier = string;

export type Event = "step_line" | "call" | "return" | "exception";

export interface StackFrame {
  frame_id: StackFrameId;
  function_name: string;
  function_code: string;

  /**
   * Range of the function code
   * relative to the whole program
   */
  code_line_start: number;
  code_col_start: number;
  code_line_end: number;
  code_col_end: number;

  /**
   * Range of the latest active code
   * inside this frame, relative to
   * the whole program
   */
  state_line_start: number;
  state_col_start: number;
  state_line_end: number;
  state_col_end: number;

  locals: Record<Identifier, Value>;
  ordered_locals: Identifier[];
  /**
   * only present when Step.event === "return"
   */
  return_value?: Value;
}

export type HeapElement = HeapArray | HeapObject | HeapFunction;

export interface HeapArray {
  kind: "array";
  id: string;
  values: Value[];
}

export interface HeapObject {
  kind: "object";
  id: string;
  entries: ObjectEntry[];
}

export interface ObjectEntry {
  key: string;
  value: Value;
}

export interface HeapFunction {
  kind: "function";
  id: string;
  name: string;
  code: string;
}

export type Value = PrimitiveValue | PointerValue;

export interface PointerValue {
  kind: "pointer";
  ref: HeapElementId;
}

type PrimitiveValue =
  | NumberValue
  | StringValue
  | BooleanValue
  | NullValue
  | UndefinedValue
  | PlusInfinityValue
  | MinusInfinityValue
  | NaNValue;

interface NumberValue {
  kind: "number";
  value: number;
}

interface StringValue {
  kind: "string";
  value: string;
}

interface BooleanValue {
  kind: "boolean";
  value: boolean;
}

interface NaNValue {
  kind: "NaN";
}

interface PlusInfinityValue {
  kind: "Infinity";
}

interface MinusInfinityValue {
  kind: "-Infinity";
}

interface NullValue {
  kind: "null";
}

interface UndefinedValue {
  kind: "undefined";
}
