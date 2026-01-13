(() => {
  // -----------------------------
  // State
  // -----------------------------
  let enabled = true;
  let mode = "E1"; // E1 or E2
  let element1Node = null;
  let element2Node = null;

  // Overlay for hover highlight
  const overlay = document.createElement("div");
  overlay.id = "__xpath_overlay__";
  Object.assign(overlay.style, {
    position: "fixed",
    zIndex: 2147483647,
    pointerEvents: "none",
    border: "2px solid rgba(119,167,255,0.95)",
    borderRadius: "6px",
    boxShadow: "0 0 0 9999px rgba(0,0,0,0.0)",
    display: "none"
  });
  document.documentElement.appendChild(overlay);

  // Label for mode + tag
  const overlayLabel = document.createElement("div");
  overlayLabel.id = "__xpath_overlay_label__";
  Object.assign(overlayLabel.style, {
    position: "fixed",
    zIndex: 2147483647,
    pointerEvents: "none",
    padding: "4px 8px",
    borderRadius: "10px",
    background: "rgba(17,26,43,0.92)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#e9eef7",
    fontSize: "12px",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    display: "none"
  });
  document.documentElement.appendChild(overlayLabel);

  function showOverlayFor(el) {
    if (!enabled || !el || el === overlay || el === overlayLabel) return;
    const r = el.getBoundingClientRect();
    overlay.style.display = "block";
    overlay.style.left = `${Math.max(0, r.left)}px`;
    overlay.style.top = `${Math.max(0, r.top)}px`;
    overlay.style.width = `${Math.max(0, r.width)}px`;
    overlay.style.height = `${Math.max(0, r.height)}px`;

    overlayLabel.style.display = "block";
    overlayLabel.textContent = `Mode: ${mode} • <${el.tagName.toLowerCase()}>`;
    overlayLabel.style.left = `${Math.max(0, r.left)}px`;
    overlayLabel.style.top = `${Math.max(0, r.top - 30)}px`;
  }

  function hideOverlay() {
    overlay.style.display = "none";
    overlayLabel.style.display = "none";
  }

  // -----------------------------
  // XPath Utilities
  // -----------------------------
  function evalCount(xpath) {
    try {
      const res = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return res.snapshotLength;
    } catch {
      return 0;
    }
  }

  function isUnique(xpath) {
    return evalCount(xpath) === 1;
  }

  function escapeQuotesForContains(s) {
    // We use contains("...") so we must avoid raw quotes breaking XPath
    // Strategy: If string contains double quotes, replace with single quotes if possible,
    // otherwise fallback to a shortened safe chunk.
    if (!s) return "";
    let t = s.replace(/\s+/g, " ").trim();
    if (!t) return "";
    // Keep it short for stability
    if (t.length > 60) t = t.slice(0, 60);
    // Remove problematic quotes (simple pragmatic approach)
    t = t.replace(/"/g, "");
    return t;
  }

  function getTextSnippet(el) {
    const raw = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    return raw.length > 40 ? raw.slice(0, 40) : raw;
  }

  function getStableText(el) {
  if (!el) return "";

  // 1️⃣ aria-label has highest priority for buttons/inputs
  const aria = el.getAttribute("aria-label");
  if (aria && aria.trim()) {
    return aria.replace(/\s+/g, " ").trim();
  }

  // 2️⃣ visible text (React-safe)
  const text = (el.textContent || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  // keep it reasonably short to avoid fragile xpaths
  return text.length > 80 ? text.slice(0, 80) : text;
}


  // Build an XPath for a given element with:
  // ID (unique) > class (unique) > text (unique-ish) > absolute indexed path
  function buildElementXPath(el, requireUnique = true) {
  const tag = el.tagName.toLowerCase();

  // 1️⃣ ID
  if (el.id) {
    const xp = `//${tag}[@id="${el.id}"]`;
    if (!requireUnique || isUnique(xp)) {
      return { xpath: xp, selectorType: "id" };
    }
  }

  // 2️⃣ className
  for (const cls of el.classList) {
    const xp = `//${tag}[contains(@class,"${cls}")]`;
    if (!requireUnique || isUnique(xp)) {
      return { xpath: xp, selectorType: "class" };
    }
  }

  // 3️⃣ aria-label
  const aria = el.getAttribute("aria-label");
  if (aria) {
    const xp = `//${tag}[contains(@aria-label,"${aria}")]`;
    if (!requireUnique || isUnique(xp)) {
      return { xpath: xp, selectorType: "aria-label" };
    }
  }

  // 4️⃣ text
  const text = getStableText(el);
  if (text) {
    const xp = `//${tag}[contains(normalize-space(.),"${text}")]`;
    if (!requireUnique || isUnique(xp)) {
      return { xpath: xp, selectorType: "text" };
    }
  }

  // 5️⃣ absolute fallback ONLY for Element 1
  if (requireUnique) {
    return {
      xpath: buildAbsoluteXPath(el),
      selectorType: "absolute"
    };
  }

  // ❌ DO NOT fallback to absolute for Element 2
  return {
    xpath: `//${tag}`,
    selectorType: "tag-fallback"
  };
}

function generateElement2Options(el) {
  const tag = el.tagName.toLowerCase();
  const options = [];
  const seen = new Set();

  function add(xp, label) {
    if (!seen.has(xp)) {
      seen.add(xp);
      options.push({ xpath: xp, label });
    }
  }

  // -------- direct element strategies --------

  if (el.id) {
    add(`//${tag}[contains(@id,"${el.id}")]`, "By ID");
  }

  for (const cls of el.classList) {
    add(`//${tag}[contains(@class,"${cls}")]`, `By class: ${cls}`);
  }

  const aria = el.getAttribute("aria-label");
  if (aria) {
    add(`//${tag}[contains(@aria-label,"${aria}")]`, "By aria-label");
  }

  const text = getStableText(el);
  if (text) {
    add(`//${tag}[contains(normalize-space(.),"${text}")]`, "By text");
  }

  // data-* attributes
  for (const attr of el.attributes) {
    if (attr.name.startsWith("data-") && attr.value) {
      add(
        `//${tag}[contains(@${attr.name},"${attr.value}")]`,
        `By ${attr.name}`
      );
    }
  }

  // -------- parent-scoped strategies (up to 2 levels) --------

  let parent = el.parentElement;
  let depth = 0;

  while (parent && depth < 2) {
    const pTag = parent.tagName.toLowerCase();

    if (parent.id) {
      for (const opt of [...options]) {
        add(
          `//${pTag}[contains(@id,"${parent.id}")]${opt.xpath.replace(`//${tag}`, `//${tag}`)}`,
          `Via parent id (${parent.id}) → ${opt.label}`
        );
      }
    }

    for (const cls of parent.classList || []) {
      for (const opt of [...options]) {
        add(
          `//${pTag}[contains(@class,"${cls}")]${opt.xpath.replace(`//${tag}`, `//${tag}`)}`,
          `Via parent class (${cls}) → ${opt.label}`
        );
      }
    }

    parent = parent.parentElement;
    depth++;
  }

  return options;
}



  function buildAbsoluteXPath(el) {
    // /html/body/div[2]/... style absolute path
    if (el === document.documentElement) return "/html";
    if (el === document.body) return "/html/body";

    const parts = [];
    let node = el;

    while (node && node.nodeType === 1 && node !== document.documentElement) {
      const tag = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (!parent) break;

      const siblingsSameTag = Array.from(parent.children).filter(c => c.tagName.toLowerCase() === tag);
      const idx = siblingsSameTag.indexOf(node) + 1;
      parts.push(`${tag}[${idx}]`);
      node = parent;

      if (node === document.body) {
        parts.push("body[1]");
        node = document.documentElement;
        parts.push("html[1]");
        break;
      }
    }

    return "/" + parts.reverse().join("/");
  }

  // Nearest Common Ancestor
  function getAncestors(node) {
    const a = [];
    let cur = node;
    while (cur && cur.nodeType === 1) {
      a.push(cur);
      cur = cur.parentElement;
    }
    return a;
  }

  function findNearestCommonAncestor(a, b) {
    const aAnc = getAncestors(a);
    const bAnc = new Set(getAncestors(b));
    for (const x of aAnc) {
      if (bAnc.has(x)) return x;
    }
    return document.body;
  }

  // Generate NCA (nearest common ancestor) options for a pair of elements
  function generateNCAOptions(element1, element2) {
    const options = [];
    const seen = new Set();

    function add(xpath, label) {
      if (!seen.has(xpath)) {
        seen.add(xpath);
        options.push({ xpath, label });
      }
    }

    const ancestor = findNearestCommonAncestor(element1, element2);
    let current = ancestor;
    let depth = 0;

    while (current && depth < 3) {
      const tag = current.tagName.toLowerCase();

      if (current.id) {
        add(
          `/ancestor::${tag}[contains(@id,"${current.id}")]`,
          `By id: ${current.id}`
        );
      }

      for (const cls of current.classList || []) {
        add(
          `/ancestor::${tag}[contains(@class,"${cls}")]`,
          `By class: ${cls}`
        );
      }

      // fallback position (optional)
      add(
        `/ancestor::${tag}`,
        `By tag: ${tag}`
      );

      current = current.parentElement;
      depth++;
    }

    return options;
  }

  // Build ancestor predicate with your rule:
  // ID always > class ONLY if unique else text fallback
  function buildBestAncestorPredicate(ancestor) {
    const tag = ancestor.tagName.toLowerCase();

    // 1) ID always prioritized
    if (ancestor.id) {
      // Use contains(@id,"...") as you asked
      return { tag, predicate: `contains(@id,"${ancestor.id}")`, selectorType: "id" };
    }

    // 2) className only if unique for that tag+class
    const classList = Array.from(ancestor.classList || []).filter(Boolean);
    for (const cls of classList) {
    return {
        tag,
        predicate: `contains(@class,"${cls}")`,
        selectorType: "class"
    };
    }


    // 3) text fallback if class not unique
    const text = escapeQuotesForContains(getTextSnippet(ancestor));
    if (text) {
      const testXPath = `//${tag}[contains(normalize-space(.),"${text}")]`;
      if (isUnique(testXPath)) {
        return { tag, predicate: `contains(normalize-space(.),"${text}")`, selectorType: "text" };
      }
    }

    // 4) absolute fallback (use absolute path as predicate-less, but we must produce ancestor::tag[predicate]
    // We'll use absolute xpath uniqueness by converting to something stable:
    // ancestor::tag[1] is not safe, so we use absolute path of ancestor itself in a different way:
    // We'll later use: (ABSOLUTE_ANCESTOR_XPATH) as anchor, but your desired format is ancestor::...
    // So we use an index among same-tag siblings at that level
    const parent = ancestor.parentElement;
    if (parent) {
      const siblingsSameTag = Array.from(parent.children).filter(c => c.tagName.toLowerCase() === tag);
      const idx = siblingsSameTag.indexOf(ancestor) + 1;
      return { tag, predicate: `position()=${idx}`, selectorType: "position" };
    }

    return { tag, predicate: "1=1", selectorType: "fallback" };
  }

  async function getSelectedElement2XPath() {
    const st = await chrome.storage.local.get(["element2"]);
    return st?.element2?.xpath || "";
    }


async function buildFinalXPathWithE2Override(e2OverrideXPath) {
  if (!element1Node || !element2Node) return { ok: false, error: "Select both elements first." };

  const ancestor = findNearestCommonAncestor(element1Node, element2Node);

  // Element 1 must be unique
  const e1 = buildElementXPath(element1Node, true);

  // Ancestor predicate (ID > class > text > fallback)
  const anc = buildBestAncestorPredicate(ancestor);

  // Element 2 should come from dropdown selection (override), else fallback to relaxed build
  const e2XPath = (e2OverrideXPath && e2OverrideXPath.trim())
    ? e2OverrideXPath.trim()
    : buildElementXPath(element2Node, false).xpath;

  // default NCA based on ancestor predicate
  const defaultNCA = `/ancestor::${anc.tag}[${anc.predicate}]`;

  // prefer stored NCA if present
  const st = await chrome.storage.local.get(["nca"]);
  const ncaXPath = st?.nca?.xpath || defaultNCA;

  const finalXPath = `${e1.xpath}${ncaXPath}${e2XPath.startsWith("//") ? e2XPath : `//${e2XPath}`}`;

  return {
    ok: true,
    finalXPath,
    element1: { xpath: e1.xpath, selectorType: e1.selectorType, tag: element1Node.tagName.toLowerCase(), textSnippet: getTextSnippet(element1Node) },
    element2: { xpath: e2XPath, selectorType: "custom", tag: element2Node.tagName.toLowerCase(), textSnippet: getTextSnippet(element2Node) },
    ancestor: { tag: anc.tag, selectorType: anc.selectorType, predicate: anc.predicate }
  };
}


  // -----------------------------
  // Persist / Update Storage
  // -----------------------------
  async function writeStateToStorage(partial) {
    await chrome.storage.local.set(partial);
  }

  async function syncFromStorage() {
    const st = await chrome.storage.local.get(["enabled", "mode", "element1", "element2", "finalXPath"]);
    enabled = st.enabled !== undefined ? !!st.enabled : true;
    mode = st.mode || "E1";
  }

  // -----------------------------
  // Event Handlers
  // -----------------------------
  function onMouseMove(e) {
    if (!enabled) return hideOverlay();
    const el = e.target;
    if (!el || el === overlay || el === overlayLabel) return;
    showOverlayFor(el);
  }

  function onScrollOrResize() {
    // if overlay visible, keep it roughly aligned (simple hide to prevent weird offsets)
    if (overlay.style.display === "block") hideOverlay();
  }

  async function onClickCapture(e) {
    if (!enabled) return;
    const el = e.target;
    if (!el || el === overlay || el === overlayLabel) return;

    // Avoid capturing popup/extension UI (not on page anyway) or our overlay
    e.preventDefault();
    e.stopPropagation();

    if (mode === "E1") {
      element1Node = el;
    } else if (mode === "E2") {
      element2Node = el;
    }

    // If both elements selected, generate and persist NCA options
    if (element1Node && element2Node) {
      const ncaOptions = generateNCAOptions(element1Node, element2Node);
      await writeStateToStorage({
        nca: {
          xpath: ncaOptions[0]?.xpath || "",
          options: ncaOptions
        }
      });
    }

    // if element2 already has a chosen xpath, use it; otherwise built will fallback
    const currentE2 = await getSelectedElement2XPath();
    const built = await buildFinalXPathWithE2Override(currentE2);


    if (mode === "E1") {
      const e1 = buildElementXPath(element1Node);
      writeStateToStorage({
        element1: { xpath: e1.xpath, selectorType: e1.selectorType, tag: element1Node.tagName.toLowerCase(), textSnippet: getTextSnippet(element1Node) },
        finalXPath: built.ok ? built.finalXPath : ""
      });
    } else {
      const e2Options = generateElement2Options(element2Node);
        writeStateToStorage({
        element2: {
            xpath: e2Options[0]?.xpath || "",
            selectorType: "custom",
            tag: element2Node.tagName.toLowerCase(),
            textSnippet: getTextSnippet(element2Node),
            options: e2Options
        },
        finalXPath: built.ok ? built.finalXPath : ""
        });

    }
  }

  // -----------------------------
  // Message Listener (Popup ↔ Content)
  // -----------------------------
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
      if (!msg?.type) return sendResponse({ ok: false });

      if (msg.type === "SET_E2_XPATH") {
        const xpath = (msg.xpath || "").trim();

        // update storage element2.xpath
        const st = await chrome.storage.local.get(["element2"]);
        await writeStateToStorage({
            element2: { ...(st.element2 || {}), xpath }
        });

        // recompute final xpath immediately
        const built = await buildFinalXPathWithE2Override(xpath);
        await writeStateToStorage({ finalXPath: built.ok ? built.finalXPath : "" });

        return sendResponse({ ok: true });
      }

      if (msg.type === "SET_NCA_XPATH") {
        const xpath = (msg.xpath || "").trim();

        // update storage nca.xpath
        const st = await chrome.storage.local.get(["nca"]);
        await writeStateToStorage({ nca: { ...(st.nca || {}), xpath } });

        // recompute final xpath immediately using current element2 selection
        const e2Sel = await getSelectedElement2XPath();
        const built = await buildFinalXPathWithE2Override(e2Sel);
        await writeStateToStorage({ finalXPath: built.ok ? built.finalXPath : "" });

        return sendResponse({ ok: true });
      }

      if (msg.type === "SET_NCA_XPATH") {
        const st = await chrome.storage.local.get(["nca"]);
        await writeStateToStorage({
            nca: { ...(st.nca || {}), xpath: msg.xpath }
        });

        const e2Sel = await getSelectedElement2XPath();
        const built = buildFinalXPathWithE2Override(e2Sel);

        await writeStateToStorage({
            finalXPath: built.ok ? built.finalXPath : ""
        });

        return sendResponse({ ok: true });
      }

  

      if (msg.type === "SET_ENABLED") {
        enabled = !!msg.enabled;
        if (!enabled) hideOverlay();
        await writeStateToStorage({ enabled });
        return sendResponse({ ok: true });
      }

      if (msg.type === "SET_MODE") {
        mode = msg.mode === "E2" ? "E2" : "E1";
        await writeStateToStorage({ mode });
        return sendResponse({ ok: true });
      }

      if (msg.type === "CLEAR_E1") {
        element1Node = null;
        await writeStateToStorage({ element1: null, finalXPath: "" });
        return sendResponse({ ok: true });
      }

      if (msg.type === "CLEAR_E2") {
        element2Node = null;
        await writeStateToStorage({ element2: null, finalXPath: "" });
        return sendResponse({ ok: true });
      }

      if (msg.type === "CLEAR_ALL") {
        element1Node = null;
        element2Node = null;
        await writeStateToStorage({ element1: null, element2: null, finalXPath: "" });
        return sendResponse({ ok: true });
      }

      if (msg.type === "GENERATE_FINAL") {
        const e2Sel = await getSelectedElement2XPath();
        const built = await buildFinalXPathWithE2Override(e2Sel);

        if (!built.ok) return sendResponse({ ok: false, error: built.error });

        await writeStateToStorage({
          element1: built.element1,
          element2: built.element2,
          finalXPath: built.finalXPath
        });

        return sendResponse({ ok: true });
      }

      sendResponse({ ok: false });
    })();

    return true;
  });

  // -----------------------------
  // Init
  // -----------------------------
  (async () => {
    await syncFromStorage();

    document.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize, true);

    // Capture click in capture phase so sites don't hijack it
    document.addEventListener("click", onClickCapture, true);

    chrome.storage.onChanged.addListener(() => {
      syncFromStorage();
    });
  })();
})();
