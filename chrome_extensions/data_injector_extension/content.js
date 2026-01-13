(() => {
  let lastTarget = null;

  function isInjectable(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    const editable = el.isContentEditable === true;
    if (editable) return true;

    if (tag === "textarea") return true;
    if (tag === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      const allowed = [
        "text",
        "email",
        "password",
        "search",
        "tel",
        "url",
        "number"
      ];
      return allowed.includes(type) && !el.readOnly && !el.disabled;
    }
    return false;
  }

  function setLastTarget(el) {
    if (isInjectable(el)) lastTarget = el;
  }

  // Track focus/click
  document.addEventListener("focusin", (e) => setLastTarget(e.target), true);
  document.addEventListener("mousedown", (e) => setLastTarget(e.target), true);
  document.addEventListener("touchstart", (e) => setLastTarget(e.target), true);

  function insertTextIntoInput(el, text) {
    el.focus();

    // Standard inputs/textareas
    if (el.tagName && (el.tagName.toLowerCase() === "input" || el.tagName.toLowerCase() === "textarea")) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;

      const before = el.value.slice(0, start);
      const after = el.value.slice(end);

      el.value = before + text + after;

      const newPos = start + text.length;
      el.setSelectionRange(newPos, newPos);

      // Trigger events for frameworks (React/Vue/etc.)
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    // contenteditable
    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (!sel) return false;

      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      if (!range) {
        // fallback append
        el.textContent = (el.textContent || "") + text;
      } else {
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }

    return false;
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.type !== "injectText") return;

    const text = String(msg.text ?? "");

    // Prefer currently active element if injectable
    const active = document.activeElement;
    const target = isInjectable(active) ? active : lastTarget;

    if (!target) {
      sendResponse({ ok: false, error: "No focused input found. Click an input on the page first." });
      return true;
    }

    const ok = insertTextIntoInput(target, text);
    sendResponse({ ok, error: ok ? null : "Could not inject into the selected element." });
    return true;
  });
})();
