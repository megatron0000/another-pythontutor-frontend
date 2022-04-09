export type Trace = Step[];

export interface Step {
  stdout: string;
  line: number;
  function_name: string;
  event: Event;
  return_value?: Value; // if pythontutor is consistent, will only be present when event === "return"
  globals: Record<Identifier, Value>;
  ordered_globals: Identifier[];
  stack_frames: StackFrame[];
  heap: Record<HeapElementId, HeapElement>;
}

export type HeapElementId = string;

export type Identifier = string;

export type Event = "step_line" | "call" | "return" | "exception";

export interface StackFrame {
  function_name: string;
  frame_id: number;
  locals: Record<Identifier, Value>;
  ordered_locals: Identifier[];
}

export type HeapElement =
  | HeapArray
  | HeapObject
  | HeapFunction
  | PrimitiveValue;

interface HeapArray {
  kind: "array";
  id: string;
  values: (PrimitiveValue | PointerValue)[];
}

interface HeapObject {
  kind: "object";
  id: string;
  entries: { key: string; value: PrimitiveValue | PointerValue }[];
}

interface HeapFunction {
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
