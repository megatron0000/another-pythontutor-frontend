/**
 * Parses a given JS code string so that we are able to tell, from a given
 * [line, column] pair, what is the function we are inside and what are its
 * bounds
 */

import { Program } from "estree";
import { FunctionInfo, ParsedCode, Range } from "../types/parser";
import * as acorn from "acorn";

class ParsedCodeImplementation implements ParsedCode {
  #unparsedLines: string[];
  #parsedCode: Program;

  constructor(code: string) {
    this.#unparsedLines = code.split(/\r?\n/);
    this.#parsedCode = acorn.parse(code, {
      ecmaVersion: 6,
      ranges: true,
      locations: true
    }) as unknown as Program;
  }

  codeRange(range: Range): string {
    const [startLine, startCol] = range.start;
    const [endLine, endCol] = range.end;

    if (startLine === endLine) {
      return this.#unparsedLines[startLine - 1].slice(startCol, endCol);
    }

    const lines = [];
    lines.push(this.#unparsedLines[startLine - 1].slice(startCol));
    lines.push(...this.#unparsedLines.slice(startLine, endLine - 1));
    lines.push(this.#unparsedLines[endLine - 1].slice(0, endCol));

    return lines.join("\n");
  }

  location2FunctionStack(line: number, col: number): FunctionInfo[] {
    function containsBounds(node: any) {
      return (
        (node.loc?.start.line < line ||
          (node.loc?.start.line === line && node.loc?.start.column <= col)) &&
        (node.loc?.end.line > line ||
          (node.loc?.end.line === line && node.loc?.end.column >= col))
      );
    }

    function isFunctionNode(node: any) {
      const functionTypes = [
        "FunctionDeclaration",
        "FunctionExpression",
        "ArrowFunctionExpression"
      ];
      return functionTypes.includes(node.type);
    }

    const functions: FunctionInfo[] = [];

    /**
     * @param node an AST node (i.e. something with .type string property)
     */
    function recurse(node: any): void {
      for (const child_or_list of Object.values(node)) {
        if (Array.isArray(child_or_list)) {
          for (const child of child_or_list) {
            if (
              child &&
              typeof child.type === "string" &&
              containsBounds(child)
            ) {
              if (isFunctionNode(child)) {
                functions.push({
                  start: [child.loc.start.line, child.loc.start.column],
                  end: [child.loc.end.line, child.loc.end.column]
                });
              }
              recurse(child);
              return;
            }
          }
        } else {
          const child = child_or_list as any;
          if (
            child &&
            typeof child.type === "string" &&
            containsBounds(child)
          ) {
            if (isFunctionNode(child)) {
              functions.push({
                start: [child.loc.start.line, child.loc.start.column],
                end: [child.loc.end.line, child.loc.end.column]
              });
            }
            recurse(child);
          }
        }
      }
    }

    recurse(this.#parsedCode);
    return functions;
  }
}

export function parseCode(code: string): ParsedCode {
  return new ParsedCodeImplementation(code);
}

// define(["acorn"], function (acorn: Acorn): ParserModule {

// });
