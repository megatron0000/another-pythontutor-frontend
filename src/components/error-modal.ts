import { errorToString } from "../utils";

const errorMessage =
  "A aplicação encontrou um erro. O relatório de erro inclui o seu código e o estado da aplicação.";

const pleaseRestartMessage =
  "Feito ! Por favor, salve seu código e recarregue a página";

const sendReportButtonMessage =
  "Enviar relatório de erro<br />(saberemos do erro e vamos corrigir)";

const errorReportAPI =
  "https://script.google.com/macros/s/AKfycbxWsKSDIfi_RnflbsYmRwsXsB7VhDeg60dbqsC_fYmt8VzlnhLE2ZScgGgjUyY_U3I/exec";

const errorModal = document.getElementById("error-modal")!;
const errorModalMessage = errorModal.querySelector("#error-modal-message")!;

const sendReportButton = errorModal.querySelector(
  "#send-error-report-button"
) as HTMLButtonElement;
const dontSendReportButton = errorModal.querySelector(
  "#dont-send-error-report-button"
) as HTMLButtonElement;
const errorModalOKButton = errorModal.querySelector(
  "#error-modal-ok-button"
) as HTMLButtonElement;

export function showErrorModal(userCode: string, error: unknown) {
  console.error(error);
  openModal();
  modalInitialState();

  dontSendReportButton.onclick = () => modalEndState();

  sendReportButton.onclick = async () => {
    sendReportButton.disabled = true;
    sendReportButton.innerHTML = "Enviando...";

    try {
      await sendErrorReport(userCode, error);
    } catch (err) {
      // do nothing, the error report itself failed
      // FIXME: do something better here
    }

    sendReportButton.disabled = false;
    sendReportButton.innerHTML = sendReportButtonMessage;

    modalEndState();
  };

  errorModalOKButton.onclick = () => closeModal();
}

function openModal() {
  errorModal.style.display = "flex";
}

function modalInitialState() {
  errorModalMessage.textContent = errorMessage;

  sendReportButton.style.display = "block";
  dontSendReportButton.style.display = "block";
  errorModalOKButton.style.display = "none";
}

function modalEndState() {
  errorModalMessage.textContent = pleaseRestartMessage;

  sendReportButton.innerHTML = sendReportButtonMessage;

  sendReportButton.style.display = "none";
  dontSendReportButton.style.display = "none";
  errorModalOKButton.style.display = "block";
}

function closeModal() {
  errorModal.style.display = "none";
}

/**
 * @throws if anything goes wrong
 */
async function sendErrorReport(
  userCode: string,
  error: unknown
): Promise<void> {
  const response = await fetch(errorReportAPI, {
    method: "POST",
    body: JSON.stringify({
      "user-code": userCode,
      error: await errorToString(error)
    })
  });

  if (!response.ok) {
    throw new Error(
      `sendErrorReport: bad status: ${
        response.status
      }. body is: ${await response.text()}`
    );
  }

  const body = await response.json();

  if (body.error !== null) {
    throw new Error(`sendErrorReport: error response: ${body}`);
  }
}
