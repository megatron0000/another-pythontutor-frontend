import { createEditor } from "../components/code-editor";
import { MessageAPI } from "../components/message-api";
import type { PageLifecycle } from "./page-lifecycle";

type CodeEditor = ReturnType<typeof createEditor>;

export interface EditPage extends PageLifecycle {
  getValue(): string;
  hasErrors(): boolean;
  focus(): void;
}

const DEFAULT_CODE = "// Controles: veja página de ajuda\n// (botão '?')";

export function createEditPage(options: {
  onVisualize: () => void;
  initialCode?: string;
}): EditPage {
  const buttonVisualize = document.getElementById(
    "visualize-execution-button"
  ) as HTMLButtonElement;

  const editor: CodeEditor = createEditor(
    "code-editor-container",
    options.initialCode ?? DEFAULT_CODE,
    () => {
      buttonVisualize.disabled = editor.hasErrors();
    }
  );

  new MessageAPI().listen(() => {
    editor.focus();
  });

  buttonVisualize.addEventListener("click", () => {
    options.onVisualize();
  });

  const startup = () => {
    // Ensure the button state matches current editor validity on page entry.
    buttonVisualize.style.display = "block";
    buttonVisualize.textContent = "Executar";
    buttonVisualize.disabled = editor.hasErrors();
  };

  const teardown = () => {
    buttonVisualize.style.display = "none";
  };

  return {
    startup,
    teardown,
    getValue: () => editor.getValue(),
    hasErrors: () => editor.hasErrors(),
    focus: () => editor.focus()
  };
}
