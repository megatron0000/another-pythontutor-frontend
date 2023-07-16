/**
 * We want to know, for each code execution step, what are the bounds
 * of the function we are currently at.
 *
 * This module parses the code to find this information
 */

/**
 * 1-based line, 0-based col
 */
export interface FunctionInfo {
  start: [line: number, col: number];
  end: [line: number, col: number];
}

export interface Range {
  start: [line: number, col: number];
  end: [line: number, col: number];
}

export interface ParsedCode {
  /**
   * @returns Function bodies where the code is inside, from outer-most to inner-most
   */
  location2FunctionStack(line: number, col: number): FunctionInfo[];

  codeRange(range: Range): string;
}

export default interface ParserModule {
  parseCode(code: string): ParsedCode;
}
