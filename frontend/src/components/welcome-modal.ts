/**
 * Welcome modal (help quickstart)
 */

const WELCOME_MODAL_DONT_SHOW_KEY = "welcome-modal-dont-show";

function shouldShowWelcomeModal(): boolean {
  try {
    return localStorage.getItem(WELCOME_MODAL_DONT_SHOW_KEY) !== "true";
  } catch {
    // If storage is unavailable, default to showing.
    return true;
  }
}

function openWelcomeModal() {
  const welcomeModal = document.getElementById("welcome-modal") as HTMLElement;
  if (!welcomeModal) return;
  welcomeModal.style.display = "flex";
}

function closeWelcomeModal() {
  const welcomeModal = document.getElementById("welcome-modal") as HTMLElement;
  const dontShowCheckbox = document.getElementById(
    "welcome-modal-dont-show"
  ) as HTMLInputElement | null;

  if (dontShowCheckbox?.checked) {
    try {
      localStorage.setItem(WELCOME_MODAL_DONT_SHOW_KEY, "true");
    } catch {
      // ignore
    }
  }

  if (welcomeModal) {
    welcomeModal.style.display = "none";
  }
}

/**
 * Show welcome modal on first load (unless user opted out)
 */
export function initializeWelcomeModal() {
  const welcomeModalCloseButton = document.getElementById(
    "welcome-modal-close"
  ) as HTMLButtonElement | null;

  welcomeModalCloseButton?.addEventListener("click", () => closeWelcomeModal());

  if (shouldShowWelcomeModal()) {
    openWelcomeModal();
  }
}
