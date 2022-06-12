/**
 * We use a trace format that differs slightly from pythontutor,
 * so this module knows how to make the conversion
 */

export interface Trace {
  programCode: string;
  steps: Step[];
}

export interface Step {
  stdout: Stdout;
  line: number;
  col: number;
  function_name: string;
  event: Event;
  stack_frames: StackFrame[]; // the first frame is the global scope, with id=0
  heap: Record<HeapElementId, HeapElement>;
  exception_message?: string; // string only if Step.event === "exception"
}

export type Stdout = { content: string; line: number }[];

export type StackFrameId = number;

export type HeapElementId = string;

export type Identifier = string;

export type Event = "step_line" | "call" | "return" | "exception";

export interface StackFrame {
  function_name: string;
  // id is 0 for the first frame (global frame)
  frame_id: StackFrameId;
  locals: Record<Identifier, Value>;
  ordered_locals: Identifier[];
  // assuming pythontutor is correct,
  // will only be present when Step.event === "return"
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

export default interface TraceModule {
  convertTrace(pyTutorTrace: any): Trace;
}
