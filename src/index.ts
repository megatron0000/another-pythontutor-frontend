/**
 * Root script file. Sets up the edit and visualize pages.
 */

import { createEditPage } from "./pages/edit-page";
import { createVisualizePage } from "./pages/visualize-page";
import type { PageLifecycle } from "./pages/page-lifecycle";
import { initializeWelcomeModal } from "./components/welcome-modal";

initializeWelcomeModal();

/**
 * Navigation
 */

type Page = "edit" | "visualize";

const PAGE_SELECTORS: Record<Page, string> = {
  edit: "#edit",
  visualize: "#visualize"
};

let currentPage: Page | null = null;
let pages: Record<Page, PageLifecycle>;

function showPage(page: Page) {
  document
    .querySelectorAll<HTMLElement>("main > section")
    .forEach(el => el.classList.add("hidden"));

  const target = document.querySelector<HTMLElement>(PAGE_SELECTORS[page]);
  if (target) {
    target.classList.remove("hidden");
  }
}

function navigateTo(page: Page) {
  if (currentPage === page) {
    showPage(page);
    return;
  }

  if (currentPage) {
    pages[currentPage].teardown();
  }

  // Show the page before startup so layout-dependent code measures correctly.
  currentPage = page;
  showPage(page);
  pages[page].startup();
}

function initializeNavigation() {
  navigateTo("edit");
}

/**
 * Pages
 */

const editPage = createEditPage({
  onVisualize: () => navigateTo("visualize")
});

const visualizePage = createVisualizePage({
  getEditorValue: () => editPage.getValue(),
  onEdit: () => navigateTo("edit")
});

pages = {
  edit: editPage,
  visualize: visualizePage
};

initializeNavigation();

/**
 * 5: warning on exit page
 */

// https://stackoverflow.com/a/7317311
window.addEventListener("beforeunload", function (e) {
  if (!editPage.getValue()) return undefined;

  const confirmationMessage =
    "Seu código não será salvo. Se necessário, salve-o antes de sair";

  (e || window.event).returnValue = confirmationMessage; //Gecko + IE
  return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
});
