/**
 * Quiet Ledger — client-side data layer
 * All data stays in the browser. No network calls.
 */

const STORAGE_KEY = "quiet-ledger-sessions";

/**
 * @typedef {{ id: string, date: string, minutes: number, note: string, createdAt: string }} Session
 */

/** @returns {Session[]} */
function getSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {Session[]} sessions */
function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * @param {{ minutes: number, note?: string }} data
 * @returns {Session}
 */
function addSession({ minutes, note = "" }) {
  const sessions = getSessions();
  const now = new Date();
  const session = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date: now.toISOString().slice(0, 10),
    minutes: Math.round(Number(minutes)),
    note: String(note).trim().slice(0, 500),
    createdAt: now.toISOString(),
  };
  sessions.unshift(session);
  saveSessions(sessions);
  return session;
}

/** @param {string} dateStr YYYY-MM-DD */
function getSessionsForDate(dateStr) {
  return getSessions().filter((s) => s.date === dateStr);
}

function getTodayTotal() {
  const today = new Date().toISOString().slice(0, 10);
  return getSessionsForDate(today).reduce((sum, s) => sum + s.minutes, 0);
}

function formatMinutes(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ---------- Page-specific helpers ---------- */

function renderHome() {
  const totalEl = document.getElementById("today-total");
  const listEl = document.getElementById("recent-list");
  const emptyEl = document.getElementById("empty-state");

  if (!totalEl || !listEl) return;

  const total = getTodayTotal();
  totalEl.textContent = formatMinutes(total);

  const sessions = getSessions().slice(0, 8);

  if (sessions.length === 0) {
    listEl.hidden = true;
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  listEl.hidden = false;
  listEl.innerHTML = sessions
    .map(
      (s) => `
    <li class="session-item">
      <div class="session-header">
        <span class="session-duration">${formatMinutes(s.minutes)}</span>
        <span class="meta">${formatDate(s.date)} · ${formatTime(s.createdAt)}</span>
      </div>
      ${s.note ? `<p class="session-note">${escapeHtml(s.note)}</p>` : ""}
    </li>`
    )
    .join("");
}

function renderHistory() {
  const listEl = document.getElementById("history-list");
  const emptyEl = document.getElementById("empty-state");
  if (!listEl) return;

  const sessions = getSessions();

  if (sessions.length === 0) {
    listEl.hidden = true;
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  listEl.hidden = false;
  listEl.innerHTML = sessions
    .map(
      (s) => `
    <li class="session-item">
      <div class="session-header">
        <span class="session-duration">${formatMinutes(s.minutes)}</span>
        <span class="meta">${formatDate(s.date)} · ${formatTime(s.createdAt)}</span>
      </div>
      ${s.note ? `<p class="session-note">${escapeHtml(s.note)}</p>` : ""}
    </li>`
    )
    .join("");
}

function handleLogForm() {
  const form = document.getElementById("log-form");
  if (!form) return;

  const minutesInput = document.getElementById("minutes");
  const noteInput = document.getElementById("note");
  const minutesError = document.getElementById("minutes-error");
  const successEl = document.getElementById("success-message");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Reset errors
    minutesInput.setAttribute("aria-invalid", "false");
    if (minutesError) {
      minutesError.hidden = true;
      minutesError.textContent = "";
    }

    const minutes = Number(minutesInput.value);

    if (!minutes || minutes < 1 || minutes > 600 || !Number.isInteger(minutes)) {
      minutesInput.setAttribute("aria-invalid", true);
      if (minutesError) {
        minutesError.hidden = false;
        minutesError.textContent =
          "Enter a whole number between 1 and 600 minutes.";
      }
      minutesInput.focus();
      return;
    }

    addSession({
      minutes,
      note: noteInput ? noteInput.value : "",
    });

    // Success
    if (successEl) {
      successEl.hidden = false;
      successEl.textContent = `Logged ${formatMinutes(minutes)}.`;
    }

    form.reset();
    minutesInput.focus();

    // Hide success after a few seconds
    setTimeout(() => {
      if (successEl) successEl.hidden = true;
    }, 4000);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* Boot */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "home") renderHome();
  if (page === "history") renderHistory();
  if (page === "log") handleLogForm();
});
