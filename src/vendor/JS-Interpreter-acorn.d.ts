declare module "JS-Interpreter-acorn" {
  class node_t {}

  export function parse(code: string, options?: object): node_t;
}
