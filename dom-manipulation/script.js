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

// --- data store ---
const loadQuotes = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
};
const saveQuotes = (arr) => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

/** @type {{text:string, category:string}[]} */
let quotes = loadQuotes() || [
  { text: "The best way to predict the future is to create it.", category: "Inspiration" },
  { text: "Simplicity is the soul of efficiency.", category: "Productivity" },
];

// --- DOM refs (created lazily where necessary) ---
const $ = (sel, root = document) => root.querySelector(sel);

function ensureListEl() {
  // If a dedicated display (#quoteText/#quoteCategory) isn’t on the page,
  // we’ll keep a simple <ul id="quotesList"> under the form area.
  let list = $("#quotesList");
  if (!list) {
    // try to put it right after the form div that holds the inputs
    const formDiv = $("#newQuoteText")?.closest("div") || document.body;
    list = document.createElement("ul");
    list.id = "quotesList";
    list.style.marginTop = "10px";
    formDiv.appendChild(list);
  }
  return list;
}

function render() {
  const qText = $("#quoteText");
  const qCat = $("#quoteCategory");

  if (qText && qCat) {
    // Render the most recently added (or first if none)
    if (!quotes.length) {
      qText.textContent = "No quotes yet. Add one below!";
      qCat.textContent = "";
      return;
    }
    const { text, category } = quotes[quotes.length - 1];
    qText.textContent = `“${text}”`;
    qCat.textContent = category ? `#${category}` : "";
    return;
  }

  // Fallback: render a simple list of all quotes
  const list = ensureListEl();
  list.innerHTML = "";
  quotes.forEach(({ text, category }) => {
    const li = document.createElement("li");
    li.textContent = category ? `${text} — (${category})` : text;
    list.appendChild(li);
  });
}

// --- public: called by your button onclick="addQuote()" ---
function addQuote() {
  const textEl = $("#newQuoteText");
  const catEl  = $("#newQuoteCategory");
  const text = textEl?.value.trim() || "";
  const category = catEl?.value.trim() || "";

  if (text.length < 3) {
    alert("Please enter a longer quote.");
    textEl?.focus();
    return;
  }

  quotes.push({ text, category });
  saveQuotes(quotes);
  render();

  // reset form for the next entry
  if (textEl) textEl.value = "";
  if (catEl) catEl.value = "";
  textEl?.focus();
}

// Expose addQuote globally for the inline onclick handler
window.addQuote = addQuote;

// Initial paint
document.addEventListener("DOMContentLoaded", render);
function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(event) {
    const importedQuotes = JSON.parse(event.target.result);
    quotes.push(...importedQuotes);
    saveQuotes();
    alert('Quotes imported successfully!');
  };
  fileReader.readAsText(event.target.files[0]);
}

/* Storage keys */
const LS_KEY = "quotes.data.v1";
const SS_LAST_VIEWED_KEY = "quotes.lastViewed.v1";

/* Defaults */
const DEFAULT_QUOTES = [
  { text: "The best way to predict the future is to create it.", category: "Inspiration" },
  { text: "Simplicity is the soul of efficiency.", category: "Productivity" },
];

/* Helpers */
const $ = (s, r = document) => r.querySelector(s);

function loadQuotes() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}
function saveQuotes() {
  localStorage.setItem(LS_KEY, JSON.stringify(quotes));
}

/* Safe init */
let quotes = (() => {
  const loaded = loadQuotes();
  if (Array.isArray(loaded)) {
    return loaded
      .filter(q => q && typeof q.text === "string")
      .map(q => ({ text: String(q.text).trim(), category: q.category ? String(q.category).trim() : "" }));
  }
  return DEFAULT_QUOTES.slice();
})();

/* Rendering */
function renderQuote(q) {
  const qText = $("#quoteText");
  const qCat  = $("#quoteCategory");

  if (qText && qCat) {
    qText.textContent = q ? `“${q.text}”` : "No quotes yet. Add one below!";
    qCat.textContent  = q?.category ? `#${q.category}` : "";
    return;
  }

  // Fallback list under the form
  let list = $("#quotesList");
  if (!list) {
    const host = $("#newQuoteText")?.closest("div") || document.body;
    list = document.createElement("ul");
    list.id = "quotesList";
    list.style.marginTop = "10px";
    host.appendChild(list);
  }
  list.innerHTML = "";
  quotes.forEach(({ text, category }) => {
    const li = document.createElement("li");
    li.textContent = category ? `${text} — (${category})` : text;
    list.appendChild(li);
  });
}

function showRandomQuote() {
  if (!quotes.length) {
    renderQuote(null);
    return;
  }
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  renderQuote(q);

  // Session-only: remember last viewed for this tab
  sessionStorage.setItem(SS_LAST_VIEWED_KEY, JSON.stringify(q));
}
window.showRandomQuote = showRandomQuote;

/* Add quote from inputs #newQuoteText / #newQuoteCategory */
function addQuote() {
  const textEl = $("#newQuoteText");
  const catEl  = $("#newQuoteCategory");
  const text = textEl?.value.trim() || "";
  const category = catEl?.value.trim() || "";

  if (text.length < 3) {
    alert("Please enter a longer quote.");
    textEl?.focus();
    return;
  }

  quotes.push({ text, category });
  saveQuotes();               // <-- Local Storage on every change
  renderQuote(quotes[quotes.length - 1]);

  if (textEl) textEl.value = "";
  if (catEl) catEl.value = "";
  textEl?.focus();
}
window.addQuote = addQuote;

/* JSON Export */
function exportQuotesToJson(filename = `quotes-${new Date().toISOString().slice(0,10)}.json`) {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
window.exportQuotesToJson = exportQuotesToJson;

/* JSON Import (validated, persisted, rendered) */
function importFromJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array of {text, category}.");
      const cleaned = parsed
        .filter(x => x && typeof x.text === "string")
        .map(x => ({ text: String(x.text).trim(), category: x.category ? String(x.category).trim() : "" }));
      if (!cleaned.length) throw new Error("No valid quotes found.");

      quotes.push(...cleaned);
      saveQuotes();
      renderQuote(quotes[quotes.length - 1]);
      alert("Quotes imported successfully!");
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      // allow re-importing the same file name
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}
window.importFromJsonFile = importFromJsonFile;

/* Init */
document.addEventListener("DOMContentLoaded", () => {
  // Restore last viewed quote for this session if present; else show a random one.
  const last = sessionStorage.getItem(SS_LAST_VIEWED_KEY);
  if (last) {
    try { renderQuote(JSON.parse(last)); return; } catch {}
  }
  showRandomQuote();
});
/* ========= Filtering: categories & persistence ========= */

const LS_FILTER_KEY = "quotes.selectedCategory.v1";

/** Return a sorted, de-duplicated list of categories present in quotes */
function getUniqueCategories() {
  return Array.from(new Set(quotes.map(q => (q.category || "").trim()).filter(Boolean))).sort();
}

/** Build the <select id="categoryFilter"> options from the quotes array.
 *  Restores the last selected filter from Local Storage if available.
 */
function populateCategories() {
  let sel = document.getElementById("categoryFilter");

  // Create the dropdown if it's not on the page
  if (!sel) {
    // Try to place it near the add-quote inputs; fall back to body
    const host = document.getElementById("newQuoteText")?.closest("div") || document.body;
    sel = document.createElement("select");
    sel.id = "categoryFilter";
    sel.style.margin = "8px 0";
    host.prepend(sel);
  }

  const last = localStorage.getItem(LS_FILTER_KEY) || "";
  const cats = getUniqueCategories();

  // (Re)build options
  sel.innerHTML = "";
  sel.append(new Option("All categories", "")); // empty value = no filter
  cats.forEach(c => sel.append(new Option(c, c)));

  // restore last if still valid
  sel.value = cats.includes(last) ? last : "";

  // ensure one change handler (idempotent)
  sel.onchange = () => {
    localStorage.setItem(LS_FILTER_KEY, sel.value);
    filterQuotes();
  };
}

/** Show quotes filtered by the current dropdown selection.
 *  Works with either the single-quote card (#quoteText/#quoteCategory)
 *  or the fallback <ul id="quotesList"> renderer.
 */
function filterQuotes() {
  const sel = document.getElementById("categoryFilter");
  const chosen = sel ? sel.value : "";

  const filtered = chosen
    ? quotes.filter(q => (q.category || "").trim() === chosen)
    : quotes.slice();

  // If you have a single quote display, show a random one from the filtered pool
  const qText = document.getElementById("quoteText");
  const qCat  = document.getElementById("quoteCategory");

  if (qText && qCat) {
    if (!filtered.length) {
      qText.textContent = "No quotes for this category yet.";
      qCat.textContent = "";
      return;
    }
    const q = filtered[Math.floor(Math.random() * filtered.length)];
    qText.textContent = `“${q.text}”`;
    qCat.textContent  = q.category ? `#${q.category}` : "";
  } else {
    // Fallback list render
    let list = document.getElementById("quotesList");
    if (!list) {
      const host = document.getElementById("newQuoteText")?.closest("div") || document.body;
      list = document.createElement("ul");
      list.id = "quotesList";
      host.appendChild(list);
    }
    list.innerHTML = "";
    filtered.forEach(({ text, category }) => {
      const li = document.createElement("li");
      li.textContent = category ? `${text} — (${category})` : text;
      list.appendChild(li);
    });
  }
}

/* ===== Enhance addQuote to refresh categories & keep filter consistent ===== */
const _origAddQuote = window.addQuote || function(){};  // in case you already bound it
window.addQuote = function enhancedAddQuote() {
  // call your existing addQuote implementation
  _origAddQuote();

  // after quotes[] changed: persist, rebuild categories, and reapply filter
  // (saveQuotes() is already called by your original addQuote)
  populateCategories();
  filterQuotes();
};

/* ===== Init: build categories, restore last filter, then render ===== */
document.addEventListener("DOMContentLoaded", () => {
  populateCategories();            // build dropdown from quotes[]
  filterQuotes();                  // apply last-selected filter (restored in populateCategories)
});
