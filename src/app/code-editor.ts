// https://github.com/ajaxorg/ace/issues/4782#issuecomment-1141347415
import * as ace from "ace-builds";
import "ace-builds/webpack-resolver";

import { lint } from "../linter";

export interface Editor {
  getValue(): string;
  hasErrors(): boolean;
  focus(): void;
}

export function createEditor(
  containerId: string,
  initialCode: string,
  onCodeChange: () => void
): Editor {
  const editor = ace.edit(containerId, {
    fontSize: 15,
    theme: "ace/theme/chrome",
    mode: "ace/mode/javascript",
    value: initialCode,
    keyboardHandler: "ace/keyboard/vscode",
    printMargin: false,
    minLines: 10
  });

  // disable syntax checking
  editor.session.setOption("useWorker", false);

  const linter = new Linter(editor);

  let hasErrors = false;

  editor.session.on("change", async () => {
    const lintResult = await linter.lintAndMark();
    if (lintResult !== LintResult.IGNORED) {
      hasErrors = lintResult === LintResult.HAS_ERROR;
      onCodeChange();
    }
  });

  return {
    getValue: () => editor.getValue(),
    hasErrors: () => hasErrors,
    focus: () => editor.focus()
  };
}

export enum LintResult {
  OK,
  HAS_ERROR,
  IGNORED
}

class Linter {
  /**
   * `lintNumber` used to avoid race conditions because
   * lintAndMark is async
   */
  private lintNumber: number = 0;
  private previousMarkers: number[] = [];

  constructor(private editor: ace.Ace.Editor) {}

  async lintAndMark(): Promise<LintResult> {
    // remove markers
    for (const previousMarker of this.previousMarkers) {
      this.editor.session.removeMarker(previousMarker);
    }

    // lint
    const code = this.editor.getValue();
    let lintNumberBak = ++this.lintNumber;
    const lintResult = await lint(code);
    if (lintNumberBak !== this.lintNumber) {
      return LintResult.IGNORED;
    }

    // show markers
    this.previousMarkers = lintResult.map(message =>
      this.editor.session.addMarker(
        new ace.Range(
          message.line - 1,
          message.column - 1,
          typeof message.endLine === "number"
            ? message.endLine - 1
            : message.line,
          typeof message.endColumn === "number"
            ? message.endColumn - 1
            : message.column
        ),
        "error-marker",
        "text",
        true
      )
    );

    this.editor.session.setAnnotations(
      lintResult.map(message => ({
        row: message.line! - 1,
        column: message.column - 1,
        text: message.message,
        type: "error"
      }))
    );

    return lintResult.length > 0 ? LintResult.HAS_ERROR : LintResult.OK;
  }
}
