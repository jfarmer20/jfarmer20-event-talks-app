/* ══════════════════════════════════════════════════════════════
   BigQuery Release Notes – Frontend Logic (TypeScript)
   ══════════════════════════════════════════════════════════════ */

// ── Types ──────────────────────────────────────────────────────

interface Section {
  category: string;
  category_class: string;
  body: string;
}

interface Entry {
  title: string;
  date: string;
  date_raw: string;
  link: string;
  sections: Section[];
}

interface ApiResponse {
  ok: boolean;
  entries?: Entry[];
  error?: string;
}

// ── DOM helpers ────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function show(element: Element): void {
  element.classList.remove("hidden");
}

function hide(element: Element): void {
  element.classList.add("hidden");
}

// ── Elements ───────────────────────────────────────────────────

const refreshBtn     = el<HTMLButtonElement>("refresh-btn");
const refreshIcon    = document.getElementById("refresh-icon") as unknown as SVGSVGElement;
const spinnerIcon    = document.getElementById("spinner-icon") as unknown as SVGSVGElement;
const refreshLabel   = el<HTMLSpanElement>("refresh-label");
const lastUpdatedEl  = el<HTMLSpanElement>("last-updated");
const statsBar       = el<HTMLDivElement>("stats-bar");
const statCount      = el<HTMLSpanElement>("stat-count");
const statLatest     = el<HTMLSpanElement>("stat-latest");
const entriesList    = el<HTMLOListElement>("entries-list");
const emptyState     = el<HTMLDivElement>("empty-state");
const errorState     = el<HTMLDivElement>("error-state");
const errorMessage   = el<HTMLParagraphElement>("error-message");

// Tweet modal
const tweetModal     = el<HTMLDivElement>("tweet-modal");
const modalClose     = el<HTMLButtonElement>("modal-close");
const modalEntryDate = el<HTMLParagraphElement>("modal-entry-date");
const tweetText      = el<HTMLTextAreaElement>("tweet-text");
const charCounter    = el<HTMLSpanElement>("char-counter");
const tweetLink      = el<HTMLAnchorElement>("tweet-link");

// Export CSV
const exportCsvBtn   = el<HTMLButtonElement>("export-csv-btn");

// ── State ──────────────────────────────────────────────────────

let isLoading  = false;
let allEntries: Entry[] = [];

// ── Fetch & render ─────────────────────────────────────────────

async function fetchReleaseNotes(): Promise<void> {
  if (isLoading) return;
  isLoading = true;

  // Loading UI
  refreshBtn.disabled = true;
  hide(refreshIcon);
  show(spinnerIcon);
  refreshLabel.textContent = "Loading…";
  hide(emptyState);
  hide(errorState);

  try {
    const response = await fetch("/api/release-notes");
    const data: ApiResponse = await response.json();

    if (!data.ok || !data.entries) {
      throw new Error(data.error || "Unknown error from server.");
    }

    allEntries = data.entries;
    renderEntries(data.entries);

    // Stats bar
    statCount.textContent = `${data.entries.length} releases`;
    statLatest.textContent = data.entries.length > 0
      ? `Latest: ${data.entries[0].date}`
      : "";
    show(statsBar);
    show(exportCsvBtn);

    // Timestamp
    const now = new Date();
    lastUpdatedEl.textContent = `Updated ${now.toLocaleTimeString()}`;

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errorMessage.textContent = message;
    hide(emptyState);
    show(errorState);
    hide(statsBar);
    hide(exportCsvBtn);
  } finally {
    isLoading = false;
    refreshBtn.disabled = false;
    show(refreshIcon);
    hide(spinnerIcon);
    refreshLabel.textContent = "Refresh";
  }
}

// ── Entry rendering ────────────────────────────────────────────

function buildSectionHTML(section: Section, entryTitle: string, entryDate: string, entryLink: string): string {
  const sharedDataAttrs = [
    `data-category="${escapeAttr(section.category)}"`,
    `data-date="${escapeAttr(entryDate)}"`,
    `data-title="${escapeAttr(entryTitle)}"`,
    `data-link="${escapeAttr(entryLink)}"`,
    `data-body="${escapeAttr(stripHtml(section.body))}"`,
  ].join(" ");

  return `
    <li class="section-item">
      <div class="section-top">
        <span class="category-badge badge-${section.category_class}">${escapeHtml(section.category)}</span>
        <div class="section-actions">
          <button class="btn-copy-card copy-section-btn" aria-label="Copy ${escapeAttr(section.category)} section to clipboard" ${sharedDataAttrs}>
            <svg class="icon-clipboard" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="2" width="8" height="11" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
              <path d="M5 4H4a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 4 14h6a1.5 1.5 0 0 0 1.5-1.5V12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <svg class="icon-check" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:none">
              <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="copy-label">Copy</span>
          </button>
          <button class="btn-tweet-card tweet-section-btn" aria-label="Tweet: ${escapeAttr(section.category)} update from ${escapeAttr(entryDate)}" ${sharedDataAttrs}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
            </svg>
            Tweet
          </button>
        </div>
      </div>
      <div class="section-body">${section.body}</div>
    </li>`;
}

function renderEntries(entries: Entry[]): void {
  entriesList.innerHTML = "";

  if (entries.length === 0) {
    show(emptyState);
    return;
  }

  const fragment = document.createDocumentFragment();

  entries.forEach((entry, index) => {
    const li = document.createElement("li");
    li.className = "entry-card";
    li.style.setProperty("--index", String(index));

    const sectionsHTML = entry.sections
      .map((section, i) => {
        const sectionHtml = buildSectionHTML(section, entry.title, entry.date, entry.link);
        if (i < entry.sections.length - 1) {
          return sectionHtml + '<hr class="section-divider" />';
        }
        return sectionHtml;
      })
      .join("");

    li.innerHTML = `
      <div class="entry-header">
        <h2 class="entry-date">
          <a class="entry-date-link" href="${escapeAttr(entry.link)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(entry.title)}
          </a>
        </h2>
      </div>
      <ul class="sections-list">
        ${sectionsHTML}
      </ul>`;

    fragment.appendChild(li);
  });

  entriesList.appendChild(fragment);

  // Attach tweet button listeners
  document.querySelectorAll<HTMLButtonElement>(".tweet-section-btn").forEach(btn => {
    btn.addEventListener("click", () => openTweetModal(btn));
  });

  // Attach copy button listeners
  document.querySelectorAll<HTMLButtonElement>(".copy-section-btn").forEach(btn => {
    btn.addEventListener("click", () => copySection(btn));
  });
}

// ── Tweet modal ────────────────────────────────────────────────

function openTweetModal(btn: HTMLButtonElement): void {
  const category = btn.dataset.category ?? "";
  const date     = btn.dataset.date     ?? "";
  const body     = btn.dataset.body     ?? "";
  const link     = btn.dataset.link     ?? "";

  // Build default tweet text
  const prefix = `📢 BigQuery Update — ${category} (${date})\n\n`;
  const suffix  = `\n\n🔗 ${link}\n#BigQuery #GoogleCloud`;
  const maxBody = 280 - prefix.length - suffix.length;
  const truncatedBody = body.length > maxBody
    ? body.slice(0, maxBody - 1) + "…"
    : body;

  const defaultText = prefix + truncatedBody + suffix;

  modalEntryDate.textContent = `${category} · ${date}`;
  tweetText.value = defaultText;
  updateCharCounter();
  updateTweetLink();

  show(tweetModal);
  tweetText.focus();
  tweetText.setSelectionRange(0, 0);
}

function closeTweetModal(): void {
  hide(tweetModal);
}

function updateCharCounter(): void {
  const len = tweetText.value.length;
  charCounter.textContent = `${len} / 280`;
  charCounter.classList.toggle("near-limit", len >= 240 && len < 280);
  charCounter.classList.toggle("at-limit",   len >= 280);
}

function updateTweetLink(): void {
  const text = encodeURIComponent(tweetText.value);
  tweetLink.href = `https://twitter.com/intent/tweet?text=${text}`;
}

tweetText.addEventListener("input", () => {
  updateCharCounter();
  updateTweetLink();
});

modalClose.addEventListener("click", closeTweetModal);

tweetModal.addEventListener("click", (e: MouseEvent) => {
  if (e.target === tweetModal) closeTweetModal();
});

document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape" && !tweetModal.classList.contains("hidden")) {
    closeTweetModal();
  }
});

// ── Copy to clipboard ──────────────────────────────────────────

function copySection(btn: HTMLButtonElement): void {
  const category = btn.dataset.category ?? "";
  const date     = btn.dataset.date     ?? "";
  const body     = btn.dataset.body     ?? "";
  const link     = btn.dataset.link     ?? "";

  const text = `${category} — ${date}\n\n${body}\n\n${link}`;

  navigator.clipboard.writeText(text).then(() => {
    // Swap icons and label
    const clipboardIcon = btn.querySelector<SVGElement>(".icon-clipboard");
    const checkIcon     = btn.querySelector<SVGElement>(".icon-check");
    const label         = btn.querySelector<HTMLSpanElement>(".copy-label");

    btn.classList.add("copied");
    if (clipboardIcon) clipboardIcon.style.display = "none";
    if (checkIcon)     checkIcon.style.display     = "";
    if (label)         label.textContent            = "Copied!";

    setTimeout(() => {
      btn.classList.remove("copied");
      if (clipboardIcon) clipboardIcon.style.display = "";
      if (checkIcon)     checkIcon.style.display     = "none";
      if (label)         label.textContent            = "Copy";
    }, 2000);
  }).catch(() => {
    // Fallback for browsers without clipboard API
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity  = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}

// ── Export CSV ─────────────────────────────────────────────────

/**
 * Escape a value for RFC-4180 CSV: wrap in quotes, double internal quotes.
 */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}`;
}

function exportToCSV(): void {
  if (allEntries.length === 0) return;

  const header = ["Date", "Category", "Summary", "Link"];
  const rows: string[][] = [];

  allEntries.forEach(entry => {
    entry.sections.forEach(section => {
      rows.push([
        entry.date,
        section.category,
        stripHtml(section.body),
        entry.link,
      ]);
    });
  });

  const csvContent = [
    header.map(csvCell).join(","),
    ...rows.map(row => row.map(csvCell).join(",")),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  a.href     = url;
  a.download = `bigquery-release-notes-${date}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportCsvBtn.addEventListener("click", exportToCSV);

// ── Utilities ──────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/\n/g, " ");
}

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent ?? tmp.innerText ?? "").trim();
}

// ── Bootstrap ─────────────────────────────────────────────────

refreshBtn.addEventListener("click", fetchReleaseNotes);

// Auto-load on page open
show(emptyState);
fetchReleaseNotes();
