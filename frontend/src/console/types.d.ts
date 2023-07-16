/**
 * Implementation of the console window inside the visualization
 */

import type { Stdout } from "../trace/types";

export interface Console {
  rerender(stdout: Stdout, stderr?: string): void;
}

export default interface ConsoleModule {
  createConsole(container: HTMLElement): Console;
}
