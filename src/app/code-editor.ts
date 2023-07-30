// https://github.com/ajaxorg/ace/issues/4782#issuecomment-1141347415
import * as ace from "ace-builds";
import "ace-builds/webpack-resolver";

import { lint } from "../linter";

export function createEditor(
  containerId: string,
  initialCode: string,
  onCodeChange: (newCode: string) => void
) {
  const editor = ace.edit(containerId, {
    fontSize: 15,
    theme: "ace/theme/chrome",
    mode: "ace/mode/javascript",
    maxLines: Infinity, // trick to make container height resize with editor content,
    value: initialCode,
    keyboardHandler: "ace/keyboard/vscode",
    printMargin: false,
    minLines: 10
  });

  // disable syntax checking
  editor.session.setOption("useWorker", false);

  const linter = new Linter(editor);

  editor.session.on("change", () => {
    onCodeChange(editor.getValue());
    linter.lintAndMark();
  });

  return editor;
}

class Linter {
  /**
   * `lintNumber` used to avoid race conditions because
   * lintAndMark is async
   */
  private lintNumber: number = 0;
  private previousMarkers: number[] = [];

  constructor(private editor: ace.Ace.Editor) {}

  async lintAndMark() {
    // remove markers
    for (const previousMarker of this.previousMarkers) {
      this.editor.session.removeMarker(previousMarker);
    }

    // lint
    const code = this.editor.getValue();
    let lintNumberBak = ++this.lintNumber;
    const lintResult = await lint(code);
    if (lintNumberBak !== this.lintNumber) {
      return;
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
  }
}
