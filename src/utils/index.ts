import { fromError } from "stacktrace-js";

export function isPrimitive(
  value: unknown
): value is number | string | boolean | undefined | null {
  return (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    value === undefined ||
    value === null
  );
}

export async function errorToString(error: unknown): Promise<string> {
  if (error === null || typeof error !== "object") {
    return String(error);
  }

  let result = "";

  result += "name" in error ? `${error.name}: ` : "<Unknown Error>: ";
  result += "message" in error ? error.message : "<no message>";
  result +=
    "stack" in error
      ? `\n${await sourceMapStackTrace(error as Error)}`
      : "\n<no stack>";

  return result;
}

async function sourceMapStackTrace(error: Error) {
  return fromError(error)
    .then(values => values.map(value => value.toString()).join("\n"))
    .catch(err => error.stack);
}

/**
 * @returns a - b
 */
export function setDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
  const diff: Set<T> = new Set();

  for (const elem of a) {
    if (b.has(elem)) continue;
    diff.add(elem);
  }

  return diff;
}

export function assertArray<T, U>(x: T[] | U): T[] {
  return x as T[];
}

/**
 * Polyfill for Object.fromEntries
 */
export function objectFromEntries<T>(
  entries: [string, T][]
): Record<string, T> {
  const val: Record<string, T> = {};
  for (const [key, value] of entries) {
    val[key] = value;
  }
  return val;
}
