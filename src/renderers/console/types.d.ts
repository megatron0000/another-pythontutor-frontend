/**
 * Implementation of the console window inside the visualization
 */

import type { Stdout } from "../../trace/types";

export interface ConsoleLayouter {
  rerender(stdout: Stdout, stderr?: string): void;

  clear(): void;
}

export default interface ConsoleModule {
  createConsoleLayouter(container: HTMLElement): ConsoleLayouter;
}
