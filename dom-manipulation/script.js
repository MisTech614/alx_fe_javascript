/* ------script.js-----------
 * A tiny quotes app that builds its own user interactions, handles DOM interactions,
 * and manages an array of quote objects: { text, category }.
 * Exposes: showRandomQuote(), createAddQuoteForm()
 */

(() => {
    // ------- Storage helpers -------
    const STORAGE_KEY = "quotes.data.v1";
    const save = (quotes) => localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    const load = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };
  
    // ------- Data -------
    const defaultQuotes = [
      { text: "The best way to predict the future is to create it.", category: "Inspiration" },
      { text: "Simplicity is the soul of efficiency.", category: "Productivity" },
      { text: "What you do speaks so loudly that I cannot hear what you say.", category: "Wisdom" },
      { text: "If it works, don’t touch it.", category: "Humor" },
    ];
  
    /** @type {{text:string, category:string}[]} */
    let quotes = load() || defaultQuotes.slice();
  
    // ------- DOM helpers -------
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const el = (tag, attrs = {}, ...children) => {
      const node = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === "class") node.className = v;
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
        else if (v !== false && v != null) node.setAttribute(k, v);
      });
      for (const child of children.flat()) {
        if (child == null) continue;
        node.append(child.nodeType ? child : document.createTextNode(String(child)));
      }
      return node;
    };
  
    // ------- UI Elements -------
    let ui = {};
    function buildUI() {
      const root =
        $("#app") ||
        document.body.appendChild(el("div", { id: "app" })); // fallback if page has no #app
  
      root.innerHTML = ""; // fresh render
  
      const title = el("h1", { class: "q-title" }, "Quotes");
  
      const toolbar = el(
        "div",
        { class: "q-toolbar" },
        el(
          "button",
          { class: "q-btn", id: "randomBtn", onclick: () => showRandomQuote() },
          "🎲 Random Quote"
        ),
        el(
          "button",
          { class: "q-btn", id: "addBtn", onclick: () => createAddQuoteForm() },
          "➕ Add Quote"
        ),
        el(
          "select",
          {
            id: "categoryFilter",
            class: "q-select",
            onchange: () => showRandomQuote(),
            title: "Filter by category",
          },
          // options injected later
        )
      );
  
      const card = el(
        "div",
        { class: "q-card", id: "quoteCard" },
        el("blockquote", { id: "quoteText", class: "q-text" }, "Click “Random Quote” to begin."),
        el("div", { class: "q-meta" },
          el("span", { id: "quoteCategory", class: "q-chip" }, "")
        )
      );
  
      const formHost = el("div", { id: "formHost" });
  
      root.append(title, toolbar, card, formHost);
  
      // store references
      ui = {
        root,
        toolbar,
        card,
        formHost,
        quoteText: $("#quoteText", card),
        quoteCategory: $("#quoteCategory", card),
        categoryFilter: $("#categoryFilter", toolbar),
      };
  
      renderCategoryOptions();
      injectStylesOnce();
    }
  
    function renderCategoryOptions() {
      const current = ui.categoryFilter?.value || "";
      const cats = Array.from(new Set(quotes.map((q) => q.category))).sort();
      ui.categoryFilter.innerHTML = "";
      ui.categoryFilter.append(el("option", { value: "" }, "All categories"));
      cats.forEach((c) => ui.categoryFilter.append(el("option", { value: c }, c)));
      // restore previous selection if still present
      if ($$(`option[value="${CSS.escape(current)}"]`, ui.categoryFilter).length) {
        ui.categoryFilter.value = current;
      }
    }
  
    // ------- Core features -------
    // Display a random quote, optionally filtered by the selected category.
    function showRandomQuote() {
      const filter = ui.categoryFilter?.value || "";
      const pool = filter ? quotes.filter((q) => q.category === filter) : quotes.slice();
  
      if (pool.length === 0) {
        ui.quoteText.textContent = "No quotes available for this category yet.";
        ui.quoteCategory.textContent = "";
        return;
      }
  
      const idx = Math.floor(Math.random() * pool.length);
      const { text, category } = pool[idx];
  
      ui.quoteText.textContent = `“${text}”`;
      ui.quoteCategory.textContent = category;
      ui.card.classList.add("flash");
      setTimeout(() => ui.card.classList.remove("flash"), 250);
    }
  
    // Create & mount a form for adding a new quote (with validation).
    function createAddQuoteForm() {
      // If form already open, just focus
      const existing = $("#addQuoteForm", ui.formHost);
      if (existing) {
        existing.querySelector("textarea").focus();
        return;
      }
  
      const form = el(
        "form",
        { id: "addQuoteForm", class: "q-form" },
        el("h2", { class: "q-form-title" }, "Add a new quote"),
        el("label", { for: "quoteInput" }, "Quote text"),
        el("textarea", {
          id: "quoteInput",
          required: true,
          rows: 3,
          placeholder: "e.g. Code is like humor. When you have to explain it, it’s bad.",
        }),
        el("label", { for: "categoryInput" }, "Category"),
        el("input", {
          id: "categoryInput",
          type: "text",
          required: true,
          list: "categoryList",
          placeholder: "e.g. Programming",
        }),
        // datalist from existing categories
        el(
          "datalist",
          { id: "categoryList" },
          ...Array.from(new Set(quotes.map((q) => q.category)))
            .sort()
            .map((c) => el("option", { value: c }))
        ),
        el(
          "div",
          { class: "q-form-actions" },
          el(
            "button",
            { type: "submit", class: "q-btn q-primary" },
            "Save Quote"
          ),
          el(
            "button",
            {
              type: "button",
              class: "q-btn",
              onclick: () => form.remove(),
            },
            "Cancel"
          )
        )
      );
  
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = form.querySelector("#quoteInput").value.trim();
        const category = form.querySelector("#categoryInput").value.trim();
  
        if (text.length < 4) {
          toast("Please enter a longer quote.");
          return;
        }
        if (!category) {
          toast("Please provide a category.");
          return;
        }
  
        quotes.push({ text, category });
        save(quotes);
        renderCategoryOptions();
        toast("Quote added!");
        form.remove();
        showRandomQuote();
      });
  
      ui.formHost.append(form);
      form.querySelector("textarea").focus();
    }
  
    // ------- Tiny toast -------
    let toastTimer = null;
    function toast(message) {
      let t = $("#toast");
      if (!t) {
        t = el("div", { id: "toast" });
        document.body.append(t);
      }
      t.textContent = message;
      t.className = "show";
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => (t.className = ""), 1600);
    }
  
    // ------- Styles (scoped, minimal) -------
    function injectStylesOnce() {
      if ($("#quotes-style")) return;
      const css = `
        #app { max-width: 820px; margin: 32px auto; padding: 0 16px; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
        .q-title { margin: 0 0 16px; font-size: 28px; }
        .q-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
        .q-btn { padding: 8px 12px; border: 1px solid #ccc; border-radius: 10px; background: #fff; cursor: pointer; }
        .q-btn:hover { background: #f6f6f6; }
        .q-primary { border-color: #4f46e5; }
        .q-select { padding: 8px 10px; border: 1px solid #ccc; border-radius: 10px; background: #fff; }
        .q-card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.04); transition: transform .15s ease; }
        .q-card.flash { transform: scale(1.01); }
        .q-text { margin: 0 0 12px; font-size: 20px; line-height: 1.5; }
        .q-meta { display: flex; gap: 8px; align-items: center; }
        .q-chip { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-size: 12px; }
        .q-form { margin-top: 16px; padding: 16px; border: 1px dashed #c7c7c7; border-radius: 12px; background: #fafafa; display: grid; gap: 8px; }
        .q-form-title { margin: 0 0 4px; font-size: 18px; }
        .q-form input, .q-form textarea, .q-form select { padding: 8px 10px; border: 1px solid #c9c9c9; border-radius: 10px; font: inherit; background: #fff; }
        .q-form-actions { margin-top: 6px; display: flex; gap: 8px; }
        #toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: #111; color: #fff; padding: 10px 14px; border-radius: 999px; opacity: 0; pointer-events: none; transition: opacity .2s ease; font-size: 14px; }
        #toast.show { opacity: .9; }
      `;
      document.head.appendChild(el("style", { id: "quotes-style" }, css));
    }
  
    // ------- Init -------
    document.addEventListener("DOMContentLoaded", () => {
      buildUI();
      // Auto-show one on first load for a nice initial state
      showRandomQuote();
    });
  
    // ------- Public API (global functions the prompt asked for) -------
    window.showRandomQuote = showRandomQuote;
    window.createAddQuoteForm = createAddQuoteForm;
  })();
  /* ========= new quotes =========
 * Adds quotes dynamically from the form:
 *  #newQuoteText, #newQuoteCategory, button onclick="addQuote()"
 * Keeps an in-memory array (and persists to localStorage).
 * Renders either:
 *   - a live list (#quotesList) under the form, or
 *   - a single quote display if elements #quoteText / #quoteCategory exist.
 */

const STORAGE_KEY = "quotes.data.v1";

/* =========================== Storage Keys =========================== */
const LS_QUOTES_KEY   = "quotes.data.v1";
const LS_FILTER_KEY   = "quotes.selectedCategory.v1";
const SS_LAST_VIEWED  = "quotes.lastViewed.v1";
const LS_CONFLICTS    = "quotes.sync.conflicts.v1";

/* =========================== Mock API ============================== */
const API_BASE = "https://jsonplaceholder.typicode.com";

/* =========================== Helpers =============================== */
const $ = (sel, root = document) => root.querySelector(sel);

(function ensureToast() {
  if ($("#toast")) return;
  const t = document.createElement("div");
  t.id = "toast";
  Object.assign(t.style, {
    position: "fixed", left: "50%", bottom: "24px", transform: "translateX(-50%)",
    background: "#111", color: "#fff", padding: "10px 14px", borderRadius: "999px",
    opacity: "0", pointerEvents: "none", transition: "opacity .2s", zIndex: 9999, fontSize: "14px"
  });
  document.body.appendChild(t);
})();
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.style.opacity = ".95";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.style.opacity = "0"), 1600);
}

/* =========================== Load / Save =========================== */
function loadQuotes() {
  try { const raw = localStorage.getItem(LS_QUOTES_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function saveQuotes(quotes) {
  localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(quotes));
}

/* =========================== Data ================================= */
const DEFAULT_QUOTES = [
  { id: "loc-1", text: "The best way to predict the future is to create it.", category: "Inspiration", _dirty:false },
  { id: "loc-2", text: "Simplicity is the soul of efficiency.", category: "Productivity", _dirty:false },
];

let quotes = (() => {
  const loaded = loadQuotes();
  if (Array.isArray(loaded)) return loaded;
  localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(DEFAULT_QUOTES));
  return DEFAULT_QUOTES.slice();
})();

/* =========================== Rendering ============================= */
function renderQuote(q) {
  const qText = $("#quoteText");
  const qCat  = $("#quoteCategory");
  if (!qText || !qCat) return;

  if (!q) {
    qText.textContent = "No quotes yet. Add one below!";
    qCat.textContent = "";
  } else {
    qText.textContent = `“${q.text}”`;
    qCat.textContent  = q.category ? `#${q.category}` : "";
  }
}

/* =========================== Filtering ============================= */
function getUniqueCategories() {
  return Array.from(new Set(quotes.map(q => (q.category || "").trim()).filter(Boolean))).sort();
}

function populateCategories() {
  let sel = $("#categoryFilter");
  if (!sel) {
    // create if not present
    const host = $("#newQuoteText")?.closest(".controls") || $("#app") || document.body;
    sel = document.createElement("select");
    sel.id = "categoryFilter";
    host.prepend(sel);
  }

  const saved = localStorage.getItem(LS_FILTER_KEY) || "";
  const cats = getUniqueCategories();

  sel.innerHTML = "";
  sel.append(new Option("All categories", ""));
  cats.forEach(c => sel.append(new Option(c, c)));

  sel.value = cats.includes(saved) ? saved : "";
  sel.onchange = onCategoryChange;

  // apply immediately
  filterQuote();
}

function onCategoryChange() {
  const sel = $("#categoryFilter");
  localStorage.setItem(LS_FILTER_KEY, sel.value);
  filterQuote();
}

/** REQUIRED: filterQuote()
 *  Filters quotes based on the selected category and updates the display.
 */
function filterQuote() {
  const chosen = ($("#categoryFilter")?.value) || "";
  const pool = chosen ? quotes.filter(q => (q.category || "").trim() === chosen) : quotes.slice();

  if (!pool.length) {
    renderQuote(null);
  } else {
    const q = pool[Math.floor(Math.random() * pool.length)];
    renderQuote(q);
    sessionStorage.setItem(SS_LAST_VIEWED, JSON.stringify(q)); // last viewed quote for this tab
  }
}

/* =========================== Actions =============================== */
function addQuote() {
  const textEl = $("#newQuoteText");
  const catEl  = $("#newQuoteCategory");
  const text = (textEl?.value || "").trim();
  const category = (catEl?.value || "").trim();

  if (text.length < 3) { alert("Please enter a longer quote."); textEl?.focus(); return; }

  const q = { id:`loc-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, text, category, _dirty:true };
  quotes.push(q);
  saveQuotes(quotes);

  // Keep filter/category UI in sync
  populateCategories();   // rebuilds options and reapplies saved filter
  filterQuote();          // re-render

  textEl.value = ""; catEl.value = ""; textEl.focus();
}
window.addQuote = addQuote;

function showRandomQuote() { filterQuote(); }
window.showRandomQuote = showRandomQuote;

/* =========================== Export / Import ======================= */
/** REQUIRED: exportToJsonFile() */
function exportToJsonFile(filename = `quotes-${new Date().toISOString().slice(0,10)}.json`) {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast("Quotes exported.");
}
window.exportToJsonFile = exportToJsonFile;

/** REQUIRED: importFromJsonFile(event) */
function importFromJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array of {text, category}");
      const cleaned = parsed
        .filter(x => x && typeof x.text === "string")
        .map(x => ({
          id: `imp-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          text: String(x.text).trim(),
          category: x.category ? String(x.category).trim() : "",
          _dirty: true
        }));
      if (!cleaned.length) throw new Error("No valid quotes found.");

      quotes.push(...cleaned);
      saveQuotes(quotes);

      populateCategories();
      filterQuote();
      toast("Quotes imported successfully!");
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      event.target.value = ""; // allow same file re-import
    }
  };
  reader.readAsText(file);
}
window.importFromJsonFile = importFromJsonFile;

/* =========================== Mock Server Sync ====================== */
/** REQUIRED: fetchQuotesFromServer() – GET mock API */
async function fetchQuotesFromServer(limit = 10) {
  const res = await fetch(`${API_BASE}/posts?_limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch from server");
  const posts = await res.json();
  // Map JSONPlaceholder posts to our quote shape
  return posts.map(p => ({
    id: `srv-${p.id}`,
    text: String(p.body || p.title || "Untitled").trim(),
    category: "Server",
    _dirty: false
  }));
}

/** REQUIRED: postQuoteToServer() – POST mock API */
async function postQuoteToServer(quote) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: quote.category || "Quote", body: quote.text })
  });
  if (!res.ok) throw new Error("Failed to post to server");
  const payload = await res.json();
  // mark as synced (mock); assign a server-ish id
  quote._dirty = false;
  if (!String(quote.id).startsWith("srv-")) quote.id = `srv-${payload.id || quote.id}`;
  return quote;
}

/** server-wins merge; store conflicts */
function mergeServerIntoLocal(serverQuotes) {
  const byId = new Map(quotes.map(q => [q.id, q]));
  const conflicts = [];

  serverQuotes.forEach(sq => {
    const local = byId.get(sq.id);
    if (!local) { quotes.push(sq); return; }

    const differs = local.text !== sq.text || (local.category || "") !== (sq.category || "");
    if (differs) {
      conflicts.push({ id: sq.id, server: sq, local: { ...local } });
      Object.assign(local, sq); // server overwrites
    } else {
      local._dirty = false;
    }
  });

  if (conflicts.length) {
    localStorage.setItem(LS_CONFLICTS, JSON.stringify(conflicts));
    showConflictBanner(conflicts.length);
    toast(`${conflicts.length} conflict(s) resolved (server won).`);
  }

  saveQuotes(quotes);
  populateCategories();
  filterQuote();
}

/** REQUIRED: syncQuotes() */
async function syncQuotes() {
  try {
    // push local dirty quotes
    const dirty = quotes.filter(q => q._dirty);
    if (dirty.length) {
      await Promise.allSettled(dirty.map(postQuoteToServer));
      saveQuotes(quotes);
    }
    // pull server quotes and merge
    const serverQuotes = await fetchQuotesFromServer(10);
    mergeServerIntoLocal(serverQuotes);
    toast("Sync complete.");
  } catch (err) {
    console.error(err);
    toast("Sync failed. See console.");
  }
}
window.syncQuotes = syncQuotes;

/** REQUIRED: periodic checking */
let pollTimer = null;
function startQuotePolling(interval = 15000) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(syncQuotes, interval);
  syncQuotes();
}
function stopQuotePolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}
window.startQuotePolling = startQuotePolling;
window.stopQuotePolling  = stopQuotePolling;

/* =========================== Conflict Banner ======================= */
function showConflictBanner(count) {
  let bar = $("#syncBanner");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "syncBanner";
    Object.assign(bar.style, {
      position:"fixed", top:0, left:0, right:0, padding:"10px 14px",
      background:"#0f172a", color:"#fff", display:"none", zIndex:9998
    });
    document.body.appendChild(bar);
  }
  bar.innerHTML = `
    🔄 Sync notice: <strong>${count}</strong> conflict(s) auto-resolved (server kept).
    <button id="viewConflictsBtn" style="margin-left:8px;">View</button>
    <button id="dismissSyncBtn" style="margin-left:8px;">Dismiss</button>
  `;
  bar.style.display = "block";
  $("#dismissSyncBtn").onclick = () => (bar.style.display = "none");
  $("#viewConflictsBtn").onclick = () => {
    const list = JSON.parse(localStorage.getItem(LS_CONFLICTS) || "[]");
    alert(
      list.map((c,i)=>`${i+1}. ID ${c.id}\n  Server: ${c.server.text} (${c.server.category})\n  Local : ${c.local.text} (${c.local.category})`).join("\n\n")
      || "No conflicts."
    );
  };
}

/* =========================== Init ================================= */
document.addEventListener("DOMContentLoaded", () => {
  // Restore last selected category
  populateCategories();

  // Restore last viewed quote for this tab, else apply current filter
  const last = sessionStorage.getItem(SS_LAST_VIEWED);
  if (last) {
    try { renderQuote(JSON.parse(last)); } catch { filterQuote(); }
  } else {
    filterQuote();
  }
});
  
  // ---- Sync meta (stored in LS so it survives reloads)
  function loadSyncMeta() {
    try { return JSON.parse(localStorage.getItem(SYNC.LS_META_KEY)) || { lastSync: 0 }; }
    catch { return { lastSync: 0 }; }
  }
  function saveSyncMeta(meta) {
    localStorage.setItem(SYNC.LS_META_KEY, JSON.stringify(meta));
  }
  
  // ---- Conflicts (persist so user can resolve later)
  function loadConflicts() {
    try { return JSON.parse(localStorage.getItem(SYNC.LS_CONFLICTS_KEY)) || []; }
    catch { return []; }
  }
  function saveConflicts(list) {
    localStorage.setItem(SYNC.LS_CONFLICTS_KEY, JSON.stringify(list));
  }
  
  // ---- Mapping: server <-> app
  function serverToQuote(post) {
    // JSONPlaceholder has { id, title, body, userId }. We'll use body as text.
    return {
      id: `srv-${post.id}`,                // namespace server ids
      text: String(post.body || post.title || "").trim() || "Untitled",
      category: "Server",                  // simple default
      updatedAt: Date.now(),               // mock timestamp (no server clock)
      _src: "server",
    };
  }
  function makeLocalQuote(text, category) {
    return {
      id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text, category, updatedAt: Date.now(), _src: "local", _dirty: true
    };
  }
  
  // ---- Public API to create local quotes with sync metadata (optional use)
  window.addQuoteWithSync = function(text, category) {
    quotes.push(makeLocalQuote(text, category));
    saveQuotes();
    toast("Added locally (will sync).");
  };
  
  // ---- Core: fetch & merge
  async function fetchServerQuotes() {
    const res = await fetch(`${SYNC.BASE_URL}/posts?_limit=10`); // limit for demo
    if (!res.ok) throw new Error("Server fetch failed");
    const posts = await res.json();
    return posts.map(serverToQuote);
  }
  
  async function pushLocalDirty() {
    const dirty = quotes.filter(q => q._dirty);
    if (!dirty.length) return;
  
    // Simulate POST each dirty quote (JSONPlaceholder won’t persist; that’s okay)
    await Promise.all(dirty.map(async q => {
      const res = await fetch(`${SYNC.BASE_URL}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: q.category || "Quote", body: q.text })
      });
      if (res.ok) {
        q._dirty = false;                 // mark as synced
        q.updatedAt = Date.now();
        q._src = "server";                // assume server accepted it
      }
    }));
    saveQuotes();
  }
  
  function mergeServerIntoLocal(serverQuotes) {
    // Build indices by id
    const byId = Object.fromEntries(quotes.map(q => [q.id || `${q.text}-${q.category}`, q]));
  
    const conflicts = [];
  
    // Upsert server quotes into local (server wins on conflict)
    serverQuotes.forEach(sq => {
      const key = sq.id || `${sq.text}-${sq.category}`;
      const local = byId[key];
  
      if (!local) {
        quotes.push(sq);
        return;
      }
  
      // Conflict: both exist and differ. Strategy: server wins, keep a backup copy for manual resolve.
      const differs = local.text !== sq.text || local.category !== sq.category;
      if (differs) {
        conflicts.push({ id: key, server: sq, local: { ...local } });
        Object.assign(local, sq); // overwrite with server
      } else {
        // No diff -> prefer non-dirty state
        local._dirty = false;
        local._src = "server";
      }
    });
  
    if (conflicts.length) {
      saveConflicts(conflicts);
      toast(`Sync: ${conflicts.length} conflict(s) resolved (server won).`);
      showConflictBanner(conflicts.length);
    }
  
    // Remove duplicates (same text/category different ids) – optional clean-up
    // Not implemented aggressively to avoid accidental data loss.
  
    saveQuotes();
  }
  
  // ---- UI: conflict banner + manual resolve
  function ensureBannerHost() {
    let bar = document.getElementById("syncBanner");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "syncBanner";
    Object.assign(bar.style, {
      position: "fixed", top: "0", left: "0", right: "0", padding: "10px 14px",
      background: "#0f172a", color: "#fff", display: "none", zIndex: 9998
    });
    document.body.appendChild(bar);
    return bar;
  }
  function showConflictBanner(count) {
    const bar = ensureBannerHost();
    bar.innerHTML = `
      <strong>Sync notice:</strong> ${count} conflict(s) auto-resolved (server version kept).
      <button id="viewConflictsBtn" style="margin-left:8px;">View</button>
      <button id="dismissSyncBtn" style="margin-left:8px;">Dismiss</button>
    `;
    bar.style.display = "block";
    $("#viewConflictsBtn").onclick = openConflictsModal;
    $("#dismissSyncBtn").onclick = () => (bar.style.display = "none");
  }
  function openConflictsModal() {
    const list = loadConflicts();
    if (!list.length) { toast("No conflicts to review."); return; }
  
    // Simple modal
    let modal = document.getElementById("conflictModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "conflictModal";
      Object.assign(modal.style, {
        position: "fixed", inset: "0", background: "rgba(0,0,0,.45)", display: "flex",
        alignItems: "center", justifyContent: "center", zIndex: 10000
      });
      const inner = document.createElement("div");
      Object.assign(inner.style, { background: "#fff", padding: "16px", borderRadius: "10px", maxWidth: "640px", width: "90%", maxHeight: "70vh", overflow: "auto" });
      inner.id = "conflictInner";
      modal.appendChild(inner);
      document.body.appendChild(modal);
      modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    }
  
    const inner = document.getElementById("conflictInner");
    inner.innerHTML = `<h3>Conflicts</h3>
      <p>Server version was applied. You can restore your local version for any item below.</p>`;
  
    list.forEach((c, i) => {
      const row = document.createElement("div");
      row.style.borderTop = "1px solid #eee";
      row.style.paddingTop = "8px";
      row.innerHTML = `
        <div style="font-size:13px; opacity:.75">ID: ${c.id}</div>
        <div><strong>Server:</strong> ${c.server.text} <em>(${c.server.category})</em></div>
        <div><strong>Local :</strong> ${c.local.text} <em>(${c.local.category})</em></div>
        <button data-index="${i}" class="restoreLocalBtn" style="margin-top:6px;">Restore Local Version</button>
      `;
      inner.appendChild(row);
    });
    const close = document.createElement("button");
    close.textContent = "Close";
    close.style.marginTop = "12px";
    close.onclick = () => modal.remove();
    inner.appendChild(close);
  
    inner.querySelectorAll(".restoreLocalBtn").forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute("data-index"));
        const c = list[idx];
        const target = quotes.find(q => (q.id || `${q.text}-${q.category}`) === c.id);
        if (target) Object.assign(target, c.local, { _dirty: true, updatedAt: Date.now() });
        saveQuotes();
        toast("Local version restored (will push on next sync).");
      };
    });
  }
  
  /* ---- SYNC ORCHESTRATION ---- */
  async function syncOnce() {
    try {
      await pushLocalDirty();
      const serverQuotes = await fetchServerQuotes();    // simulate incoming updates
      mergeServerIntoLocal(serverQuotes);
      saveSyncMeta({ lastSync: Date.now() });
      // Rebuild filters/categories if your UI has them:
      if (typeof populateCategories === "function") populateCategories();
      if (typeof filterQuotes === "function") filterQuotes();
      toast("Sync complete.");
    } catch (err) {
      console.error(err);
      toast("Sync failed. Check console.");
    }
  }
  function startServerSync(intervalMs = SYNC.INTERVAL_MS) {
    if (SYNC.timer) clearInterval(SYNC.timer);
    SYNC.timer = setInterval(syncOnce, intervalMs);
    syncOnce(); // run immediately
  }
  function stopServerSync() {
    if (SYNC.timer) clearInterval(SYNC.timer);
    SYNC.timer = null;
  }
  function syncNow() { return syncOnce(); }
  
  // Expose controls
  window.startServerSync = startServerSync;
  window.stopServerSync = stopServerSync;
  window.syncNow = syncNow;
  
  /* ---- OPTIONAL: add quick UI controls ---- */
  (function ensureSyncControls() {
    if (document.getElementById("syncControls")) return;
    const host = document.getElementById("newQuoteText")?.closest("div") || document.body;
    const wrap = document.createElement("div");
    wrap.id = "syncControls";
    wrap.style.marginTop = "8px";
    wrap.innerHTML = `
      <button id="syncNowBtn">Sync Now</button>
      <button id="syncStartBtn">Start Auto Sync</button>
      <button id="syncStopBtn">Stop Auto Sync</button>
    `;
    host.appendChild(wrap);
    $("#syncNowBtn").onclick = syncNow;
    $("#syncStartBtn").onclick = () => { startServerSync(); toast("Auto sync ON"); };
    $("#syncStopBtn").onclick = () => { stopServerSync(); toast("Auto sync OFF"); };
  })();
  
  /* ---- BOOT ---- */
  document.addEventListener("DOMContentLoaded", () => {
    // kick off auto sync (optional), or call startServerSync() from your app menu
    // startServerSync();
  });

  /* =========================================================
   QUOTES SYNC — mock server (JSONPlaceholder)
   Satisfies:
   - fetchQuotesFromServer()
   - postQuoteToServer()
   - syncQuotes()
   - periodic polling (startQuotePolling/stopQuotePolling)
   - update LS w/ server-precedence conflict resolution
   - UI notifications for updates/conflicts
   ========================================================= */

const API_BASE = "https://jsonplaceholder.typicode.com";
const LS_CONFLICTS = "quotes.sync.conflicts.v1";
const POLL_MS = 15000;

/* ---- fallbacks if not already present ---- */
window.loadQuotes ||= function () {
  try { return JSON.parse(localStorage.getItem("quotes.data.v1")) || []; } catch { return []; }
};
window.saveQuotes ||= function () {
  localStorage.setItem("quotes.data.v1", JSON.stringify(quotes));
};
window.quotes ||= loadQuotes();

/* ---- tiny toast ---- */
(function ensureToast() {
  if (document.getElementById("toast")) return;
  const t = document.createElement("div");
  t.id = "toast";
  Object.assign(t.style, {position:"fixed",left:"50%",bottom:"24px",transform:"translateX(-50%)",
    background:"#111",color:"#fff",padding:"10px 14px",borderRadius:"999px",opacity:"0",
    pointerEvents:"none",transition:"opacity .2s",zIndex:9999,fontSize:"14px"});
  document.body.appendChild(t);
})();
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.style.opacity=".95";
  clearTimeout(t._timer);t._timer=setTimeout(()=>t.style.opacity="0",1600);}

/* ---- UTIL: normalize to our shape ---- */
function mkServerQuote(p){ // JSONPlaceholder post -> our quote
  return {
    id: `srv-${p.id}`,
    text: String(p.body || p.title || "Untitled").trim(),
    category: "Server",
    updatedAt: Date.now(),
    _src: "server", _dirty: false
  };
}
function mkLocalQuote(text, category){
  return {
    id: `loc-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    text, category: category || "", updatedAt: Date.now(),
    _src: "local", _dirty: true
  };
}

/* ---- REQUIRED: fetch from mock API ---- */
async function fetchQuotesFromServer(limit = 10) {
  const res = await fetch(`${API_BASE}/posts?_limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch quotes from server");
  const posts = await res.json();
  return posts.map(mkServerQuote);
}

/* ---- REQUIRED: POST to mock API (one quote) ---- */
async function postQuoteToServer(quote) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ title: quote.category || "Quote", body: quote.text })
  });
  if (!res.ok) throw new Error("Failed to post quote to server");
  // JSONPlaceholder returns a fake id; mark as synced
  const payload = await res.json();
  quote._dirty = false;
  quote._src = "server";
  quote.updatedAt = Date.now();
  // optionally mirror server id namespace (keeps it deterministic for tests)
  if (!String(quote.id).startsWith("srv-")) quote.id = `srv-${payload.id || quote.id}`;
  return quote;
}

/* ---- merge (server-wins) + conflict capture ---- */
function mergeServerIntoLocal(serverQuotes) {
  const byId = new Map(quotes.map(q => [q.id, q]));
  const conflicts = [];

  serverQuotes.forEach(sq => {
    const local = byId.get(sq.id);
    if (!local) { quotes.push(sq); return; }

    const differs = local.text !== sq.text || (local.category||"") !== (sq.category||"");
    if (differs) {
      conflicts.push({ id: sq.id, server: sq, local: { ...local } });
      Object.assign(local, sq); // server overwrites
    } else {
      local._dirty = false; local._src = "server";
    }
  });

  if (conflicts.length) {
    localStorage.setItem(LS_CONFLICTS, JSON.stringify(conflicts));
    showConflictBanner(conflicts.length);
    toast(`${conflicts.length} conflict(s) resolved (server won).`);
  }

  saveQuotes();
  // optional UI refresh hooks if present in your app:
  if (typeof populateCategories === "function") populateCategories();
  if (typeof filterQuotes === "function") filterQuotes();
}

/* ---- REQUIRED: full sync ---- */
async function syncQuotes() {
  // 1) push local dirty
  const dirty = quotes.filter(q => q._dirty);
  if (dirty.length) {
    await Promise.allSettled(dirty.map(q => postQuoteToServer(q)));
    saveQuotes();
  }
  // 2) pull server
  const serverQuotes = await fetchQuotesFromServer(10);
  // 3) merge (server wins)
  mergeServerIntoLocal(serverQuotes);
  toast("Sync complete.");
}

/* ---- REQUIRED: periodic checking ---- */
let _pollTimer = null;
function startQuotePolling(intervalMs = POLL_MS) {
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = setInterval(syncQuotes, intervalMs);
  syncQuotes(); // run immediately
}
function stopQuotePolling() {
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = null;
}

/* ---- UI: conflict banner ---- */
function showConflictBanner(count) {
  let bar = document.getElementById("syncBanner");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "syncBanner";
    Object.assign(bar.style, {position:"fixed",top:0,left:0,right:0,padding:"10px 14px",
      background:"#0f172a",color:"#fff",display:"flex",gap:"8px",alignItems:"center",zIndex:9998});
    document.body.appendChild(bar);
  }
  bar.innerHTML = `🔄 Sync notice: <strong>${count}</strong> conflict(s) auto-resolved (server kept).
    <button id="viewConflictsBtn">View</button>
    <button id="dismissSyncBtn">Dismiss</button>`;
  bar.style.display = "flex";
  document.getElementById("dismissSyncBtn").onclick = () => (bar.style.display = "none");
  document.getElementById("viewConflictsBtn").onclick = () => {
    const list = JSON.parse(localStorage.getItem(LS_CONFLICTS) || "[]");
    alert(
      list.map((c,i)=>`${i+1}. ID ${c.id}\n  Server: ${c.server.text} (${c.server.category})\n  Local : ${c.local.text} (${c.local.category})`).join("\n\n") || "No conflicts."
    );
  };
}

/* ---- expose helpers for tests / buttons ---- */
window.mkLocalQuote = mkLocalQuote;
window.fetchQuotesFromServer = fetchQuotesFromServer;
window.postQuoteToServer = postQuoteToServer;
window.syncQuotes = syncQuotes;
window.startQuotePolling = startQuotePolling;
window.stopQuotePolling = stopQuotePolling;

/* ---- OPTIONAL: enhance your addQuote to mark dirty ---- */
(function wrapAdd(){
  const prev = window.addQuote;
  window.addQuote = function() {
    if (typeof prev === "function") return prev(); // your version already pushes + saves
    const t = document.getElementById("newQuoteText")?.value?.trim();
    const c = document.getElementById("newQuoteCategory")?.value?.trim() || "";
    if (!t || t.length < 3) { alert("Please enter a longer quote."); return; }
    quotes.push(mkLocalQuote(t, c)); saveQuotes(); toast("Added locally (will sync).");
  };
})();

/* ---- START polling if you want it automatic on load ---- */
// startQuotePolling();   // uncomment to enable auto-sync on page load