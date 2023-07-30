import { diff_match_patch } from "diff-match-patch";

const dmp = new diff_match_patch();

dmp.Diff_Timeout = 0.1;

export class DiffStack {
  /**
   * Last element is a full-text, other elements
   * are diffs
   */
  private stack: string[] = [];

  append(newText: string) {
    if (this.stack.length === 0) {
      this.stack.push(newText);
      return;
    }

    // pop the previous text, compute the diff newText=>previousText,
    // and store it
    const previousText = this.stack.pop()!;
    const diffs = dmp.diff_main(newText, previousText);
    dmp.diff_cleanupEfficiency(diffs);
    const delta = dmp.diff_toDelta(diffs);
    console.log(delta.length, newText.length);
    this.stack.push(delta);

    this.stack.push(newText);
  }

  remove(): string {
    if (this.isEmpty()) {
      throw new Error("DiffStack: cannot remove() because stack is empty");
    }

    const previousText = this.stack.pop()!;

    // if previousText is the only one that
    // was in the stack, we don't have to
    // calculate diffs
    if (this.isEmpty()) {
      return previousText;
    }

    // pop the latest diff, hydrate it into the
    // full-text
    const delta = this.stack.pop()!;
    const diff = dmp.diff_fromDelta(previousText, delta);
    const fullText = dmp.diff_text2(diff);
    this.stack.push(fullText);

    return previousText;
  }

  isEmpty(): boolean {
    return this.stack.length === 0;
  }
}
