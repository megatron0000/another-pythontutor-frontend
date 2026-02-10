import * as inspect from "browser-util-inspect";
import { Interpreter } from "../lib/code/interpreter";
import { lint } from "../lib/code/linter";
import { showErrorModal } from "./error-modal";

const RUN_DELAY_MS = 1000;

let currentGetCode: (() => string) | null = null;

const modal = document.getElementById("quick-test-modal") as HTMLElement;
const input = document.getElementById(
  "quick-test-input"
) as HTMLTextAreaElement;
const output = document.getElementById("quick-test-output") as HTMLElement;
const runButton = document.getElementById(
  "quick-test-run"
) as HTMLButtonElement;
const closeButton = document.getElementById(
  "quick-test-close"
) as HTMLButtonElement;

const parseInputText = (value: string): number[] | null => {
  const tokens = value.split(/\s+/).filter(Boolean);
  const numbers = tokens.map(token => Number(token));

  if (!numbers.every(number => Number.isFinite(number))) {
    return null;
  }

  return numbers;
};

const setOutputMessage = (message: string) => {
  output.replaceChildren();
  const messageNode = document.createElement("div");
  messageNode.className = "quick-test-output-message";
  messageNode.textContent = message;
  output.appendChild(messageNode);
};

const renderOutput = (
  stdout: Array<{ content: string; line: number }>,
  stderr?: string
) => {
  output.replaceChildren();

  if (stdout.length === 0 && !stderr) {
    setOutputMessage("Sem saída.");
    return;
  }

  const fragment = document.createDocumentFragment();
  stdout.forEach(entry => {
    const line = document.createElement("div");
    line.className = "console__line";

    const content = document.createElement("div");
    content.className = "console__line__content";
    content.textContent = entry.content;

    const lineNumber = document.createElement("div");
    lineNumber.className = "console__line__linenumber";
    lineNumber.textContent = `:${entry.line}`;

    line.append(content, lineNumber);
    fragment.appendChild(line);
  });

  if (stderr) {
    const errorLine = document.createElement("div");
    errorLine.className = "console__line error";

    const errorContent = document.createElement("div");
    errorContent.className = "console__line__content";
    errorContent.textContent = stderr;

    const errorLineNumber = document.createElement("div");
    errorLineNumber.className = "console__line__linenumber";

    errorLine.append(errorContent, errorLineNumber);
    fragment.appendChild(errorLine);
  }

  output.appendChild(fragment);
  output.scrollTop = output.scrollHeight;
};

const ensurePlaceholder = () => {
  if (output.childElementCount === 0 && !output.textContent?.trim()) {
    setOutputMessage("Sem saída.");
  }
};

const setRunning = (isRunning: boolean) => {
  runButton.disabled = isRunning;
  runButton.textContent = isRunning ? "Executando..." : "Executar teste";
  input.disabled = isRunning;
  modal.classList.toggle("quick-test-running", isRunning);
};

const wait = (durationMs: number) =>
  new Promise(resolve => window.setTimeout(resolve, durationMs));

const runQuickTest = async () => {
  if (!currentGetCode) {
    renderOutput([], "Não foi possível ler o código.");
    return;
  }

  setRunning(true);
  setOutputMessage("Executando...");

  try {
    await wait(RUN_DELAY_MS);

    const inputs = parseInputText(input.value);
    if (inputs === null) {
      renderOutput(
        [],
        "As entradas devem ser números separados por espaços ou quebras de linha."
      );
      return;
    }

    const code = currentGetCode();
    const lintErrors = lint(code);
    if (lintErrors.length > 0) {
      renderOutput(
        [],
        "Seu código tem erros. Corrija antes de executar o teste."
      );
      return;
    }

    let inputIndex = 0;

    const interpreter = new Interpreter(code, [
      [
        "input",
        (_log, throwException): number => {
          if (inputIndex >= inputs.length) {
            throwException(
              "O programa pediu mais entradas do que as fornecidas"
            );
          }
          return inputs[inputIndex++];
        }
      ],
      [
        "output",
        (log, _throwException, content: unknown) => {
          const serializedContent = inspect(content, { depth: 3 });
          log(serializedContent);
        }
      ]
    ]);

    interpreter.runToCompletion();
    const finalState = interpreter.collectState();
    renderOutput(finalState.stdout, finalState.exception_message);
  } catch (error) {
    setOutputMessage("Sem saída.");
    showErrorModal(currentGetCode(), error);
  } finally {
    setRunning(false);
  }
};

export function showQuickTestModal(getCode: () => string) {
  currentGetCode = getCode;
  modal.style.display = "flex";
  setRunning(false);
  ensurePlaceholder();
  input.focus();
}

export function hideQuickTestModal() {
  modal.style.display = "none";
  setRunning(false);
}

closeButton.addEventListener("click", () => {
  hideQuickTestModal();
});
runButton.addEventListener("click", () => {
  void runQuickTest();
});
modal.addEventListener("click", event => {
  if (event.target === modal) {
    hideQuickTestModal();
  }
});

ensurePlaceholder();
