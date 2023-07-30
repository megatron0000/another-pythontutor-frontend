/**
 * Utilities for handling values from Fraser's interpreter, and for
 * converting these values into Trace format (see `trace/types.d.ts`)
 */

import type { Node } from "JS-Interpreter-ast";
import type {
  HeapElement,
  PointerValue,
  PrimitiveValue,
  Value
} from "../trace/types";

import { Interpreter as FraserInterpreter } from "JS-Interpreter";
import { isPrimitive } from "../utils";

export function isStateType<T extends Node["type"]>(
  state: FraserInterpreter.State,
  type: T
): state is Extract<
  FraserInterpreter.State,
  { node: Extract<Node, { type: T }> }
> {
  return state.node.type === type;
}

/**
 * @param name - name of a variable to resolve, must exist in
 * the scope, else an exception will be thrown
 *
 * Adapted from FraserInterpreter.prototype.getValueFromScope (because
 * there we cannot choose a scope)
 */
export function getVariableValue(name: string, scope: FraserInterpreter.Scope) {
  if (!(name in scope.object.properties)) {
    throw new Error("getVariableValue: variable is not present in the scope");
  }

  return unboxPrimitive(scope.object.properties[name]);
}

export function unboxPrimitive<T extends FraserInterpreter.Value>(
  value: T
): Exclude<T, FraserInterpreter.BoxedPrimitive> {
  // @ts-expect-error https://github.com/microsoft/TypeScript/issues/23132
  if (isBoxedPrimitive(value)) return value.data;

  // @ts-expect-error https://github.com/microsoft/TypeScript/issues/23132
  return value;
}

export function isBoxedPrimitive<T extends FraserInterpreter.Value>(
  value: T
): value is Extract<T, FraserInterpreter.BoxedPrimitive> {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    !(value.data instanceof Date) &&
    !(value.data instanceof RegExp)
  );
}

export function isBoxedObject(
  value: FraserInterpreter.Value
): value is FraserInterpreter.BoxedObject {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    (value.data instanceof Date || value.data instanceof RegExp)
  );
}

function fraserPrimitiveToTraceValue(
  value_:
    | number
    | string
    | boolean
    | undefined
    | null
    | FraserInterpreter.BoxedPrimitive
): PrimitiveValue {
  const value = unboxPrimitive(value_);
  if (value === null) return { kind: "null" };
  if (value === undefined) return { kind: "undefined" };
  if (typeof value === "boolean") return { kind: "boolean", value };
  if (typeof value === "string") return { kind: "string", value };
  if (value === +Infinity) return { kind: "Infinity" };
  if (value === -Infinity) return { kind: "-Infinity" };
  if (isNaN(value)) return { kind: "NaN" };
  return { kind: "number", value };
}

function fraserObjectToTraceValue(
  value: FraserInterpreter.ValueObject
): PointerValue {
  return { kind: "pointer", ref: String(value.__custom_id_property__) };
}

export function fraserValueToTraceValue(value: FraserInterpreter.Value): Value {
  value = unboxPrimitive(value);
  if (isPrimitive(value)) return fraserPrimitiveToTraceValue(value);
  return fraserObjectToTraceValue(value);
}

export function fraserObjectToTraceHeapElement(
  value: Exclude<
    FraserInterpreter.ValueObject,
    FraserInterpreter.BoxedPrimitive
  >,
  programCode: string
): HeapElement {
  // we do not show properties for Date and RegExp
  // (because they either don't have "own properties", or properties
  // are non-enumerable)
  if (isBoxedObject(value)) {
    return {
      kind: "object",
      id: String(value.__custom_id_property__),
      entries: []
    };
  }

  // we also do not show properties for Error
  if (value.class === "Error") {
    return {
      kind: "object",
      id: String(value.__custom_id_property__),
      entries: []
    };
  }

  if (value.class === "Function") {
    const node = value.node;
    if (!node) {
      // native function
      return {
        kind: "function",
        id: String(value.__custom_id_property__),
        name: value.name,
        code: "fn() { [código nativo] }"
      };
    }

    return {
      kind: "function",
      id: String(value.__custom_id_property__),
      name: value.name,
      code: programCode.slice(node.start, node.end)
    };
  }

  if (value.class === "Array") {
    const length = value.properties.length as number;
    return {
      kind: "array",
      id: String(value.__custom_id_property__),
      values: Array.from({ length }, (_, index) =>
        fraserValueToTraceValue(value.properties[index])
      )
    };
  }

  // Object
  return {
    kind: "object",
    id: String(value.__custom_id_property__),
    entries: Object.keys(value.properties).map(key => ({
      key,
      value: fraserValueToTraceValue(value.properties[key])
    }))
  };
}
