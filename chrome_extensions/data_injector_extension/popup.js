const STORE_KEY = "flowInjectorData";
const UI_KEY = "flowInjectorUI";

const envSelect = document.getElementById("envSelect");
const flowSelect = document.getElementById("flowSelect");
const credInput = document.getElementById("credInput");

const copyBtn = document.getElementById("copyBtn");
const playBtn = document.getElementById("playBtn");
const editBtn = document.getElementById("editBtn");
const saveBtn = document.getElementById("saveBtn");
const delBtn = document.getElementById("delBtn");

const statusEl = document.getElementById("status");

const addToggleBtn = document.getElementById("addToggleBtn");
const addPanel = document.getElementById("addPanel");
const addEnv = document.getElementById("addEnv");
const addFlow = document.getElementById("addFlow");
const addCred = document.getElementById("addCred");
const submitBtn = document.getElementById("submitBtn");

//const envList = document.getElementById("envList");
//const flowList = document.getElementById("flowList");

const envDropdown = document.getElementById("envDropdown");
const flowDropdown = document.getElementById("flowDropdown");
const flowExistsWarn = document.getElementById("flowExistsWarn");



document.addEventListener("click", e => {
  if (!e.target.closest(".combo")) {
    closeFlowDropdown();
    closeEnvDropdown();
  }
});


 


function setStatus(msg = "", type = "info") {
  statusEl.textContent = msg;
  statusEl.className = "status " + (type || "info");
}

function normalizeKey(s) {
  return String(s ?? "").trim();
}

async function getData() {
  const res = await chrome.storage.local.get([STORE_KEY]);
  const data = res[STORE_KEY];
  return data && data.environments ? data : { environments: {} };
}

async function setData(data) {
  await chrome.storage.local.set({ [STORE_KEY]: data });
}

async function getUIState() {
  const res = await chrome.storage.local.get([UI_KEY]);
  return res[UI_KEY] || { env: "", flow: "" };
}

async function setUIState(state) {
  await chrome.storage.local.set({ [UI_KEY]: state });
}

async function updateFlowExistsWarning() {
  const env = normalizeKey(addEnv.value);
  const flow = normalizeKey(addFlow.value);

  if (!env || !flow) {
    flowExistsWarn.classList.add("hidden");
    return;
  }

  const data = await getData();

  if (data.environments?.[env]?.[flow]) {
    flowExistsWarn.textContent = `${flow} – Already added`;
    flowExistsWarn.classList.remove("hidden");
  } else {
    flowExistsWarn.classList.add("hidden");
  }
}


function getAllFlowNames(data) {
  const set = new Set();
  Object.values(data.environments || {}).forEach(envObj => {
    Object.keys(envObj || {}).forEach(flow => set.add(flow));
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function renderEnvDropdown(options) {
  envDropdown.innerHTML = "";

  if (!options.length) {
    envDropdown.classList.add("hidden");
    return;
  }

  options.forEach(env => {
    const div = document.createElement("div");
    div.className = "combo-option";
    div.textContent = env;

    div.addEventListener("click", () => {
      addEnv.value = env;
      envDropdown.classList.add("hidden");
      updateFlowExistsWarning(); // env change affects flow warning
    });

    envDropdown.appendChild(div);
  });

  envDropdown.classList.remove("hidden");
}

function closeEnvDropdown() {
  envDropdown.classList.add("hidden");
}


function renderFlowDropdown(options) {
  flowDropdown.innerHTML = "";

  if (!options.length) {
    flowDropdown.classList.add("hidden");
    return;
  }

  options.forEach(flow => {
    const div = document.createElement("div");
    div.className = "combo-option";
    div.textContent = flow;

    div.addEventListener("click", () => {
      addFlow.value = flow;
      flowDropdown.classList.add("hidden");
      updateFlowExistsWarning();
    });

    flowDropdown.appendChild(div);
  });

  flowDropdown.classList.remove("hidden");
}

function closeFlowDropdown() {
  flowDropdown.classList.add("hidden");
}


function getEnvNames(data) {
  return Object.keys(data.environments || {}).sort((a, b) => a.localeCompare(b));
}

function getFlowNames(data, env) {
  const e = data.environments?.[env] || {};
  return Object.keys(e).sort((a, b) => a.localeCompare(b));
}

function getCredential(data, env, flow) {
  return data.environments?.[env]?.[flow] ?? "";
}

function fillSelect(selectEl, options, placeholder = "— Select —") {
  selectEl.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder;
  selectEl.appendChild(ph);

  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    selectEl.appendChild(o);
  }
}

function fillDatalist(datalistEl, options) {
  datalistEl.innerHTML = "";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    datalistEl.appendChild(o);
  }
}

function setEditMode(on) {
  if (on) {
    // enable editing
    credInput.removeAttribute("readonly");
    credInput.focus();

    // hide usage actions
    copyBtn.classList.add("hidden");
    playBtn.classList.add("hidden");
    editBtn.classList.add("hidden");

    // show edit actions
    saveBtn.classList.remove("hidden");
    delBtn.classList.remove("hidden");
  } else {
    // disable editing
    credInput.setAttribute("readonly", "readonly");

    // show usage actions
    copyBtn.classList.remove("hidden");
    playBtn.classList.remove("hidden");
    editBtn.classList.remove("hidden");

    // hide edit actions
    saveBtn.classList.add("hidden");
    delBtn.classList.add("hidden");
  }
}


async function refreshUI({ keepSelection = true } = {}) {
  const data = await getData();
  const ui = await getUIState();

  /* =========================
     ENVIRONMENT DROPDOWN
     ========================= */

  const envs = getEnvNames(data);

  // preserve selection BEFORE rebuilding options
  const prevEnv =
    normalizeKey(envSelect.value) ||
    (keepSelection ? ui.env : "");

  fillSelect(
    envSelect,
    envs,
    envs.length ? "Select environment" : "No environments yet"
  );

  // restore selection AFTER rebuild
  if (prevEnv && data.environments[prevEnv]) {
    envSelect.value = prevEnv;
  }

  const env = normalizeKey(envSelect.value);

  /* =========================
     ADD PANEL ENV LIST
     ========================= */
  //fillDatalist(envList, envs);

  /* =========================
     FLOW DROPDOWN (TOP)
     ========================= */
const flows = env ? getFlowNames(data, env) : [];

// preserve flow BEFORE rebuilding
const prevFlow =
  normalizeKey(flowSelect.value) ||
  (keepSelection ? ui.flow : "");

fillSelect(
  flowSelect,
  flows,
  env
    ? flows.length
      ? "Select flow"
      : "No flows in env"
    : "Select environment first"
);

// restore AFTER rebuild
if (env && prevFlow && data.environments[env]?.[prevFlow]) {
  flowSelect.value = prevFlow;
}

const flow = normalizeKey(flowSelect.value);

  /* =========================
     ADD PANEL FLOW LIST (GLOBAL)
     ========================= */

  //const allFlows = getAllFlowNames(data);
  //fillDatalist(flowList, allFlows);

  /* =========================
     CREDENTIAL FIELD
     ========================= */

  const cred = env && flow ? getCredential(data, env, flow) : "";
  credInput.value = cred || "";
  credInput.placeholder = "Select a flow…";

  /* =========================
     SAVE UI STATE
     ========================= */

  await setUIState({
    env: env || "",
    flow: flow || ""
  });

  /* =========================
     RESET EDIT MODE
     ========================= */

  setEditMode(false);

  /* =========================
     STATUS MESSAGES
     ========================= */

  if (!envs.length) {
    setStatus("Add your first Environment + Flow below.", "info");
  } else if (env && !flows.length) {
    setStatus("This environment has no flows. Add one below.", "info");
  } else {
    setStatus("", "info");
  }
}


async function injectToActiveTab(text) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("No active tab found.", "err");
    return;
  }

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "injectText", text });
    if (res?.ok) setStatus("Injected ✅", "ok");
    else setStatus(res?.error || "Injection failed.", "err");
  } catch (e) {
    setStatus("Cannot inject on this page. Try a normal website tab.", "err");
  }
}

function requireSelection() {
  const env = normalizeKey(envSelect.value);
  const flow = normalizeKey(flowSelect.value);
  if (!env || !flow) {
    setStatus("Select Environment and Flow first.", "err");
    return null;
  }
  return { env, flow };
}

// Events
addFlow.addEventListener("focus", async () => {
  const data = await getData();
  const flows = getAllFlowNames(data);
  renderFlowDropdown(flows);
});

addFlow.addEventListener("input", async () => {
  const data = await getData();
  const flows = getAllFlowNames(data);

  const q = addFlow.value.toLowerCase();
  const filtered = flows.filter(f =>
    f.toLowerCase().includes(q)
  );

  renderFlowDropdown(filtered);
});

addEnv.addEventListener("focus", async () => {
  const data = await getData();
  const envs = getEnvNames(data);
  renderEnvDropdown(envs);
});

addEnv.addEventListener("input", async () => {
  const data = await getData();
  const envs = getEnvNames(data);

  const q = addEnv.value.toLowerCase();
  const filtered = envs.filter(e =>
    e.toLowerCase().includes(q)
  );

  renderEnvDropdown(filtered);

  updateFlowExistsWarning();
});


addFlow.addEventListener("input", updateFlowExistsWarning);
addFlow.addEventListener("blur", updateFlowExistsWarning);

addEnv.addEventListener("input", updateFlowExistsWarning);



envSelect.addEventListener("change", async () => {
  // when env changes, clear flow selection
  await setUIState({ env: normalizeKey(envSelect.value), flow: "" });
  //await refreshUI({ keepSelection: false });

  // also help Add panel flow suggestions
  addEnv.value = normalizeKey(envSelect.value) || addEnv.value;
  await refreshUI({ keepSelection: false });
});

flowSelect.addEventListener("change", async () => {
  await setUIState({ env: normalizeKey(envSelect.value), flow: normalizeKey(flowSelect.value) });
  await refreshUI({ keepSelection: false });
});

copyBtn.addEventListener("click", async () => {
  const sel = requireSelection();
  if (!sel) return;

  const v = credInput.value || "";
  if (!v) return setStatus("Nothing to copy.", "err");

  try {
    await navigator.clipboard.writeText(v);
    setStatus("Copied ✅", "ok");
  } catch {
    setStatus("Copy failed (clipboard blocked).", "err");
  }
});

playBtn.addEventListener("click", async () => {
  const sel = requireSelection();
  if (!sel) return;

  const v = credInput.value || "";
  if (!v) return setStatus("Credential is empty.", "err");

  setStatus("Injecting…", "info");
  await injectToActiveTab(v);
});

editBtn.addEventListener("click", () => {
  const sel = requireSelection();
  if (!sel) return;
  setEditMode(true);
  setStatus("Edit enabled. ✅ Save or 🗑️ Delete.", "info");
});

saveBtn.addEventListener("click", async () => {
  const sel = requireSelection();
  if (!sel) return;

  const newVal = String(credInput.value ?? "");
  const data = await getData();

  if (!data.environments[sel.env] || !data.environments[sel.env][sel.flow]) {
    setStatus("Selected item not found.", "err");
    return;
  }

  data.environments[sel.env][sel.flow] = newVal;
  await setData(data);

  setEditMode(false);
  setStatus("Saved ✅", "ok");
  await refreshUI({ keepSelection: true });
});

delBtn.addEventListener("click", async () => {
  const sel = requireSelection();
  if (!sel) return;

  const ok = confirm(`Delete flow?\n\nEnvironment: ${sel.env}\nFlow: ${sel.flow}`);
  if (!ok) return;

  const data = await getData();
  if (data.environments?.[sel.env]?.[sel.flow] == null) {
    setStatus("Already deleted.", "err");
    return;
  }

  delete data.environments[sel.env][sel.flow];

  // If env becomes empty, remove it
  if (Object.keys(data.environments[sel.env]).length === 0) {
    delete data.environments[sel.env];
  }

  await setData(data);
  await setUIState({ env: sel.env, flow: "" });

  setEditMode(false);
  setStatus("Deleted ✅", "ok");
  await refreshUI({ keepSelection: true });
});

// Add panel
addToggleBtn.addEventListener("click", async () => {
  addPanel.classList.toggle("hidden");

  // default addEnv to current env for convenience
  const env = normalizeKey(envSelect.value);
  if (!addPanel.classList.contains("hidden")) {
    if (!normalizeKey(addEnv.value) && env) addEnv.value = env;
    await refreshUI({ keepSelection: true });
  }
});

/*
addEnv.addEventListener("input", async () => {
  // update flow datalist based on typed env
  await refreshUI({ keepSelection: true });
});
*/

submitBtn.addEventListener("click", async () => {
  const env = normalizeKey(addEnv.value);
  const flow = normalizeKey(addFlow.value);
  const cred = String(addCred.value ?? "");

  if (!env) return setStatus("Environment is required.", "err");
  if (!flow) return setStatus("Flow Name is required.", "err");
  if (!cred) return setStatus("Credential is required.", "err");

  const data = await getData();
  data.environments[env] = data.environments[env] || {};
  data.environments[env][flow] = cred;

  await setData(data);
  await setUIState({ env, flow });

  // Clear add fields (keep env for convenience)
  addFlow.value = "";
  addCred.value = "";
  setStatus("Added ✅", "ok");

  await refreshUI({ keepSelection: true });
});

// Init
(async function init() {
  setStatus("Loading…", "info");
  await refreshUI({ keepSelection: true });
})();
