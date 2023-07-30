import type { Stdout } from "../trace/types";

export class ConsoleCollector {
  private history: Stdout[] = [];

  newCollector() {
    this.history.push([]);
  }

  popCollector() {
    this.history.pop();
  }

  log(content: string, line: number) {
    if (this.history.length === 0) {
      throw new Error("log: there is no open console collector");
    }

    this.history[this.history.length - 1].push({ content, line });
  }

  getAll(): Stdout {
    return this.history.reduce((prev, curr) => prev.concat(curr), []);
  }
}
