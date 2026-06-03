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
const INITIAL_CODE_PARAM = "initial_code";
const MESSAGE_TYPE_FOCUSED = "focused";
const MESSAGE_TYPE_SET_CODE = "set-code";
const MESSAGE_TYPE_RUN_CODE = "run-code";
const MESSAGE_TYPE_RUN_RESULT = "run-code-result";
const MESSAGE_TYPE_GET_CODE = "get-code";
const MESSAGE_TYPE_GET_CODE_RESULT = "get-code-result";

function getInitialCodeFromUrl(): string | undefined {
  const code = new URLSearchParams(window.location.search).get(
    INITIAL_CODE_PARAM
  );
  return code === null ? undefined : code;
}

function setInitialCodeInUrl(code: string) {
  const url = new URL(window.location.href);
  if (code) {
    url.searchParams.set(INITIAL_CODE_PARAM, code);
  } else {
    url.searchParams.delete(INITIAL_CODE_PARAM);
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

export function createEditPage(options: { onVisualize: () => void }): EditPage {
  const buttonVisualize = document.getElementById(
    "visualize-execution-button"
  ) as HTMLButtonElement;
  const buttonQuickTest = document.getElementById(
    "quick-test-button"
  ) as HTMLButtonElement;
  const runStatusStrip = document.getElementById(
    "run-status-strip"
  ) as HTMLElement;

  type RunState = "ready" | "lint-error" | "empty";

  const getRunState = (): RunState => {
    if (editor.hasErrors()) return "lint-error";
    if (editor.isEmptyProgram()) return "empty";
    return "ready";
  };

  const TYPING_FRAMES = [".", "..", "..."];
  let typingFrame = 0;
  let typingInterval: ReturnType<typeof setInterval> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_MS = 1000;

  const startTypingIndicator = () => {
    buttonVisualize.disabled = true;
    buttonQuickTest.disabled = true;
    if (typingInterval !== null) return;
    typingFrame = 0;
    runStatusStrip.textContent = TYPING_FRAMES[typingFrame];
    typingInterval = setInterval(() => {
      typingFrame = (typingFrame + 1) % TYPING_FRAMES.length;
      runStatusStrip.textContent = TYPING_FRAMES[typingFrame];
    }, 300);
  };

  const updateRunState = () => {
    if (typingInterval !== null) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
    const state = getRunState();
    const isDisabled = state !== "ready";
    buttonVisualize.disabled = isDisabled;
    buttonQuickTest.disabled = isDisabled;
    if (state === "lint-error") {
      runStatusStrip.textContent = "⚠ Corrija os erros para executar";
      runStatusStrip.dataset.kind = "lint";
    } else if (state === "empty") {
      runStatusStrip.textContent = "⚠ Escreva algum código para executar";
      runStatusStrip.dataset.kind = "empty";
    } else {
      runStatusStrip.textContent = "✓ Pronto para executar";
      runStatusStrip.dataset.kind = "ready";
    }
  };

  const editor: CodeEditor = createEditor(
    "code-editor-container",
    getInitialCodeFromUrl() ?? DEFAULT_CODE,
    () => {
      setInitialCodeInUrl(editor.getValue());
      startTypingIndicator();
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        updateRunState();
      }, DEBOUNCE_MS);
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
    buttonVisualize.textContent = "Executar";
    buttonVisualize.style.display = "block";
    buttonQuickTest.style.display = "block";
    updateRunState();
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
