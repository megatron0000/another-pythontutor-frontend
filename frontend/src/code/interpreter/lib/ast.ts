/**
 * Utilities for handling ES5 AST nodes (as defined by the acorn.js
 * library bundled with Fraser's interpreter)
 */

import { parse } from "JS-Interpreter-acorn";
import type { Node } from "JS-Interpreter-ast";

// get the constructor function acorn uses internally to
// instantiate AST nodes (acorn does not export it)
const astNodeConstructor = parse("var x = 10;").constructor;

export function isASTNode(node: unknown): node is Node {
  return (
    typeof node === "object" &&
    node !== null &&
    node.constructor === astNodeConstructor
  );
}

/**
 * @param orderedLocals Must not be used, is used internally for recursion.
 * @returns All variables declared in `node` and its children, in order
 * of source-code declaration.
 *
 * Adapted from FraseInterpreter.prototype.populateScope_
 */
export function collectLocals(
  node: Node,
  orderedLocals: string[] = []
): string[] {
  const recurse = (node: Node) => collectLocals(node, orderedLocals);

  // All the structures within which a variable or function could hide.
  switch (node.type) {
    case "VariableDeclaration":
      node.declarations.forEach(declaration =>
        orderedLocals.push(declaration.id.name)
      );
      break;
    case "FunctionDeclaration":
      orderedLocals.push(node.id.name);
      break;
    case "Program":
      node.body.forEach(directiveOrStatement => recurse(directiveOrStatement));
      break;
    case "BlockStatement":
      node.body.forEach(statement => recurse(statement));
      break;
    case "IfStatement":
      recurse(node.consequent);
      if (node.alternate) recurse(node.alternate);
      break;
    case "LabeledStatement":
      recurse(node.body);
      break;
    case "WithStatement":
      recurse(node.body);
      break;
    case "SwitchStatement":
      node.cases.forEach(switchCase => recurse(switchCase));
      break;
    case "SwitchCase":
      node.consequent.forEach(statement => recurse(statement));
      break;
    case "TryStatement":
      recurse(node.block);
      if (node.handler) recurse(node.handler);
      if (node.finalizer) recurse(node.finalizer);
      break;
    case "CatchClause":
      recurse(node.body);
      break;
    case "WhileStatement":
      recurse(node.body);
      break;
    case "DoWhileStatement":
      recurse(node.body);
      break;
    case "ForStatement":
      if (node.init) recurse(node.init);
      recurse(node.body);
      break;
    case "ForInStatement":
      recurse(node.left);
      recurse(node.body);
      break;
    default:
      break;
  }

  return orderedLocals;
}
