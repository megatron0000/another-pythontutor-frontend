import type { PointerValue, Value } from "./types";

export function isPointer(value: Value): value is PointerValue {
  return value.kind === "pointer";
}
