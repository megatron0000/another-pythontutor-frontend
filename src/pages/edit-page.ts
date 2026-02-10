import { createEditor } from "../components/code-editor";
import {
  hideQuickTestModal,
  showQuickTestModal
} from "../components/quick-test-modal";
import { messageAPI, type MessageData } from "../components/message-api";
import { Stepper, type StepKind } from "../lib/code/interpreter/lib/stepper";
import { lint } from "../lib/code/linter";
import type { PageLifecycle } from "./page-lifecycle";

type CodeEditor = ReturnType<typeof createEditor>;

export interface EditPage extends PageLifecycle {
  getValue(): string;
  hasErrors(): boolean;
  focus(): void;
}

const DEFAULT_CODE = "// Controles: veja página de ajuda\n// (botão '?')";
const DEFAULT_MAX_STEPS = 100000;
const MESSAGE_TYPE_FOCUSED = "focused";
const MESSAGE_TYPE_SET_CODE = "set-code";
const MESSAGE_TYPE_RUN_CODE = "run-code";
const MESSAGE_TYPE_RUN_RESULT = "run-code-result";
const MESSAGE_TYPE_GET_CODE = "get-code";
const MESSAGE_TYPE_GET_CODE_RESULT = "get-code-result";

export function createEditPage(options: {
  onVisualize: () => void;
  initialCode?: string;
}): EditPage {
  const buttonVisualize = document.getElementById(
    "visualize-execution-button"
  ) as HTMLButtonElement;
  const buttonQuickTest = document.getElementById(
    "quick-test-button"
  ) as HTMLButtonElement;

  const editor: CodeEditor = createEditor(
    "code-editor-container",
    options.initialCode ?? DEFAULT_CODE,
    () => {
      buttonVisualize.disabled = editor.hasErrors();
      buttonQuickTest.disabled = editor.hasErrors();
    }
  );

  let messageListenerIds: number[] = [];

  const parseNumberArray = (value: unknown): number[] | null => {
    if (!Array.isArray(value)) {
      return null;
    }

    if (
      !value.every(item => typeof item === "number" && Number.isFinite(item))
    ) {
      return null;
    }

    return value;
  };

  const resolveMaxSteps = (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return DEFAULT_MAX_STEPS;
    }

    return Math.floor(value);
  };

  const postRunResult = (
    status: "success" | "error",
    output: unknown[],
    details?: Record<string, unknown>
  ) => {
    const payload: MessageData & {
      status: "success" | "error";
      output: unknown[];
      error?: string;
      details?: Record<string, unknown>;
    } = {
      type: MESSAGE_TYPE_RUN_RESULT,
      status,
      output
    };

    if (details) {
      payload.details = details;
      if (typeof details.error === "string") {
        payload.error = details.error;
      }
    }

    window.parent.postMessage(payload, "*");
  };

  const postCodeResult = (code: string) => {
    const payload: MessageData & { code: string } = {
      type: MESSAGE_TYPE_GET_CODE_RESULT,
      code
    };

    window.parent.postMessage(payload, "*");
  };

  const handleSetCode = (data: MessageData) => {
    if (typeof data.code !== "string") {
      return;
    }

    editor.setValue(data.code);
  };

  const handleRunCode = (data: MessageData) => {
    const inputs = parseNumberArray(data.inputs);
    if (!inputs) {
      postRunResult("error", [], { error: "invalid-inputs" });
      return;
    }

    const maxSteps = resolveMaxSteps(data.maxSteps);
    const code = editor.getValue();
    const lintErrors = lint(code);
    if (lintErrors.length > 0) {
      postRunResult("error", [], { error: "lint-error", lintErrors });
      return;
    }

    const output: unknown[] = [];
    let inputIndex = 0;

    const stepper = new Stepper(code, [
      [
        "input",
        (node, throwException): number => {
          if (inputIndex >= inputs.length) {
            throwException("O programa pediu mais inputs que o fornecido");
          }
          return inputs[inputIndex++];
        }
      ],
      [
        "output",
        (node, throwException, content: unknown) => {
          output.push(content);
        }
      ]
    ]);

    let stepKind: StepKind;
    let iterations = 0;

    try {
      do {
        stepKind = stepper.step();
        iterations += 1;
      } while (
        iterations <= maxSteps &&
        stepKind.kind !== "end" &&
        stepKind.kind !== "uncaught exception"
      );
    } catch (error) {
      postRunResult("error", output, {
        error: "exception",
        message: String(error)
      });
      return;
    }

    if (iterations > maxSteps) {
      postRunResult("error", output, {
        error: "max-steps",
        maxSteps,
        iterations
      });
      return;
    }

    if (stepKind.kind === "uncaught exception") {
      postRunResult("error", output, {
        error: "uncaught-exception",
        exception: String(stepKind.exception)
      });
      return;
    }

    postRunResult("success", output);
  };

  const handleGetCode = () => {
    postCodeResult(editor.getValue());
  };

  const registerMessageListeners = () => {
    if (messageListenerIds.length > 0) {
      return;
    }

    messageListenerIds = [
      messageAPI.listen(MESSAGE_TYPE_FOCUSED, () => {
        editor.focus();
      }),
      messageAPI.listen(MESSAGE_TYPE_SET_CODE, handleSetCode),
      messageAPI.listen(MESSAGE_TYPE_RUN_CODE, handleRunCode),
      messageAPI.listen(MESSAGE_TYPE_GET_CODE, handleGetCode)
    ];
  };

  const unregisterMessageListeners = () => {
    messageListenerIds.forEach(listenerId => {
      messageAPI.remove(listenerId);
    });
    messageListenerIds = [];
  };

  buttonVisualize.addEventListener("click", () => {
    options.onVisualize();
  });

  buttonQuickTest.addEventListener("click", () => {
    showQuickTestModal(() => editor.getValue());
  });

  const startup = () => {
    // Ensure the button state matches current editor validity on page entry.
    buttonVisualize.style.display = "block";
    buttonVisualize.textContent = "Executar";
    buttonVisualize.disabled = editor.hasErrors();
    buttonQuickTest.style.display = "block";
    buttonQuickTest.disabled = editor.hasErrors();
    registerMessageListeners();
  };

  const teardown = () => {
    buttonVisualize.style.display = "none";
    buttonQuickTest.style.display = "none";
    hideQuickTestModal();
    unregisterMessageListeners();
  };

  return {
    startup,
    teardown,
    getValue: () => editor.getValue(),
    hasErrors: () => editor.hasErrors(),
    focus: () => editor.focus()
  };
}
