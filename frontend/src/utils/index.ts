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

export function errorToString(error: unknown): string {
  if (error === null || typeof error !== "object") {
    return String(error);
  }

  if ("stack" in error) {
    return String(error.stack);
  }

  if ("name" in error && "message" in error) {
    return `${error.name}: ${error.message}`;
  }

  if ("message" in error) {
    return `Error: ${error.message}`;
  }

  if ("name" in error) {
    return String(error.name);
  }

  return "Error";
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
