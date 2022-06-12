/**
 * Implementation of the console window inside the visualization
 */

import { Stdout } from "./trace";

export interface Console {
  rerender(stdout: Stdout, stderr?: string): void;
}

export default interface ConsoleModule {
  createConsole(container: HTMLElement): Console;
}
