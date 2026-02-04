/**
 * Root script file. Sets up the 2 pages of the application
 * (#edit and #visualize)
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

const PAGE_HASHES: Record<Page, string> = {
  edit: "#edit",
  visualize: "#visualize"
};

let currentPage: Page | null = null;
let pages: Record<Page, PageLifecycle>;

function getPageFromHash(hash: string): Page {
  return hash === PAGE_HASHES.visualize ? "visualize" : "edit";
}

function showPage(page: Page) {
  document
    .querySelectorAll<HTMLElement>("main > section")
    .forEach(el => el.classList.add("hidden"));

  const target = document.querySelector<HTMLElement>(PAGE_HASHES[page]);
  if (target) {
    target.classList.remove("hidden");
  }
}

function handlePageChange(nextPage: Page) {
  if (currentPage === nextPage) {
    showPage(nextPage);
    return;
  }

  if (currentPage) {
    pages[currentPage].teardown();
  }

  // Show the page before startup so layout-dependent code measures correctly.
  showPage(nextPage);
  pages[nextPage].startup();
  currentPage = nextPage;
}

function handleHashChange() {
  const nextPage = getPageFromHash(window.location.hash);
  handlePageChange(nextPage);
}

function navigateTo(page: Page) {
  const hash = PAGE_HASHES[page];
  if (window.location.hash !== hash) {
    window.location.hash = hash;
    return;
  }
  handlePageChange(page);
}

function initializeNavigation() {
  window.addEventListener("hashchange", handleHashChange);

  // Normalize initial hash so direct navigation works on first load.
  const initialPage = getPageFromHash(window.location.hash);
  if (window.location.hash !== PAGE_HASHES[initialPage]) {
    window.location.hash = PAGE_HASHES[initialPage];
    return;
  }

  handlePageChange(initialPage);
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
