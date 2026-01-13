async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0]?.id;
}

async function sendToContent(message) {
  const tabId = await getActiveTabId();
  if (!tabId) return null;
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return null;
  }
}

function setStatus(text) {
  const el = document.getElementById("status");
  el.textContent = text || "";
}

function prettyMeta(obj) {
  if (!obj) return "Not selected";
  const parts = [];
  if (obj.tag) parts.push(`<${obj.tag.toLowerCase()}>`);
  if (obj.textSnippet) parts.push(`text="${obj.textSnippet}"`);
  if (obj.selectorType) parts.push(`selector=${obj.selectorType}`);
  return parts.join(" • ");
}

/* =========================
   SEARCHABLE DROPDOWN FIX
   ========================= */

let _e2AllOptions = [];
let _ncaAllOptions = [];

function renderOptions(selectEl, options, selectedValue) {
  selectEl.innerHTML = "";
  options.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.xpath;
    o.textContent = `${opt.label} → ${opt.xpath}`;
    selectEl.appendChild(o);
  });
  if (selectedValue) {
    const exists = [...selectEl.options].some(o => o.value === selectedValue);
    if (exists) selectEl.value = selectedValue;
  }
}

function attachSearchFilter(inputId, selectId, getAllOptions, getSelectedValue) {
  const input = document.getElementById(inputId);
  const select = document.getElementById(selectId);
  if (!input || !select) return;

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    const all = getAllOptions();

    const filtered = !q
      ? all
      : all.filter(opt =>
          opt.label.toLowerCase().includes(q) ||
          opt.xpath.toLowerCase().includes(q)
        );

    renderOptions(select, filtered, getSelectedValue());
  });
}

/* =========================
   UI REFRESH
   ========================= */

async function refreshUI() {
  const st = await chrome.storage.local.get([
    "enabled",
    "mode",
    "element1",
    "element2",
    "finalXPath",
    "nca"
  ]);

  document.getElementById("enabledToggle").checked = !!st.enabled;
  document.getElementById("modeE1").checked = st.mode === "E1";
  document.getElementById("modeE2").checked = st.mode === "E2";

  document.getElementById("e1Meta").textContent = prettyMeta(st.element1);
  document.getElementById("e2Meta").textContent = prettyMeta(st.element2);

  document.getElementById("e1Xpath").value = st.element1?.xpath || "";
  document.getElementById("e2Xpath").value = st.element2?.xpath || "";
  document.getElementById("finalXpath").value = st.finalXPath || "";

  /* -------- Element 2 options -------- */
  const e2Sel = document.getElementById("e2Options");
  _e2AllOptions = st.element2?.options || [];
  renderOptions(e2Sel, _e2AllOptions, st.element2?.xpath);

  /* -------- NCA options -------- */
  const ncaSel = document.getElementById("ncaOptions");
  _ncaAllOptions = st.nca?.options || [];
  renderOptions(ncaSel, _ncaAllOptions, st.nca?.xpath);
}

/* =========================
   MAIN
   ========================= */

async function main() {
  await refreshUI();

  /* Attach searchable dropdowns (SAFE) */
  attachSearchFilter(
    "e2Search",
    "e2Options",
    () => _e2AllOptions,
    () => document.getElementById("e2Options")?.value
  );

  attachSearchFilter(
    "ncaSearch",
    "ncaOptions",
    () => _ncaAllOptions,
    () => document.getElementById("ncaOptions")?.value
  );


  document.getElementById("expandBtn")?.addEventListener("click", () => {
    const url = chrome.runtime.getURL("popup.html");
    chrome.tabs.create({ url });
  });

  document.getElementById("enabledToggle").addEventListener("change", async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.local.set({ enabled });
    await sendToContent({ type: "SET_ENABLED", enabled });
    setStatus(enabled ? "Enabled on page" : "Disabled on page");
  });

  document.getElementById("modeE1").addEventListener("change", async () => {
    await chrome.storage.local.set({ mode: "E1" });
    await sendToContent({ type: "SET_MODE", mode: "E1" });
    setStatus("Now selecting Element 1");
  });

  document.getElementById("modeE2").addEventListener("change", async () => {
    await chrome.storage.local.set({ mode: "E2" });
    await sendToContent({ type: "SET_MODE", mode: "E2" });
    setStatus("Now selecting Element 2");
  });

  document.getElementById("clearE1").addEventListener("click", async () => {
    await chrome.storage.local.set({ element1: null, finalXPath: "" });
    await sendToContent({ type: "CLEAR_E1" });
    setStatus("Cleared Element 1");
    await refreshUI();
  });

  document.getElementById("clearE2").addEventListener("click", async () => {
    await chrome.storage.local.set({ element2: null, finalXPath: "" });
    await sendToContent({ type: "CLEAR_E2" });
    setStatus("Cleared Element 2");
    await refreshUI();
  });

  document.getElementById("clearAllBtn").addEventListener("click", async () => {
    await chrome.storage.local.set({ element1: null, element2: null, finalXPath: "" });
    await sendToContent({ type: "CLEAR_ALL" });
    setStatus("Cleared all");
    await refreshUI();
  });

  document.getElementById("generateBtn").addEventListener("click", async () => {
    setStatus("Generating...");
    const res = await sendToContent({ type: "GENERATE_FINAL" });
    setStatus(res?.ok ? "Generated." : res?.error || "Could not generate.");
    await refreshUI();
  });

  document.getElementById("copyBtn").addEventListener("click", async () => {
    const val = document.getElementById("finalXpath").value.trim();
    if (!val) return setStatus("Nothing to copy.");
    await navigator.clipboard.writeText(val);
    setStatus("Copied to clipboard.");
  });

  /* Element 2 selection */
  document.getElementById("e2Options").addEventListener("change", async (e) => {
    const xpath = e.target.value;
    const st = await chrome.storage.local.get(["element2"]);
    await chrome.storage.local.set({ element2: { ...st.element2, xpath } });
    await sendToContent({ type: "SET_E2_XPATH", xpath });
    setStatus("Element 2 updated.");
    await refreshUI();
  });

  /* NCA selection */
  document.getElementById("ncaOptions").addEventListener("change", async (e) => {
    const xpath = e.target.value;
    const st = await chrome.storage.local.get(["nca"]);
    await chrome.storage.local.set({ nca: { ...st.nca, xpath } });
    await sendToContent({ type: "SET_NCA_XPATH", xpath });
    setStatus("NCA updated.");
    await refreshUI();
  });

  chrome.storage.onChanged.addListener(refreshUI);

  const st = await chrome.storage.local.get(["enabled", "mode"]);
  await sendToContent({ type: "SET_ENABLED", enabled: !!st.enabled });
  await sendToContent({ type: "SET_MODE", mode: st.mode || "E1" });
}

main();
