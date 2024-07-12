declare module "JS-Interpreter-serializer" {
  import type { Interpreter } from "JS-Interpreter";

  export function serialize(interpreter: Interpreter): object;

  /**
   * @param interpreter - Loads into this Interpreter in-place
   */
  export function deserialize(
    serialized: object,
    interpreter: Interpreter
  ): void;
}
