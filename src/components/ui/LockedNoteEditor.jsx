import React, { useEffect, useRef } from "react";

/**
 * Editor contentEditable con labels bloqueados.
 * Ahora soporta alturas controladas con CSS variables:
 *  - props.minHeight y props.maxHeight (strings CSS, ej. "120px", "32vh")
 * El contenedor podrá dejar que crezca hasta maxHeight y luego scrollee.
 */
export default function LockedNoteEditor({
  value,
  onChange,
  editing = false,
  autoFocus = false,
  section1Locked = [
    "BAN",
    "CID",
    "NAME",
    "CBR",
    "CALLER",
    "VERIFIED BY",
    "SECURITY QUESTIONS",
    "XID",
    "ADDRESS",
  ],
  hardLockedLineRegexes = [],
  minHeight = "40vh",
  maxHeight = "54vh",
}) {
  const rootRef = useRef(null);
  const styleInjected = useRef(false);

  const titleRegex = /^([A-Z0-9 ()/_|.\-]+):\s?(.*)$/;

  const toHTML = (text) => {
    const lines = (text || "").split("\n");
    const htmlLines = lines.map((line) => {
      if (hardLockedLineRegexes.some((rx) => rx.test(line))) {
        return `
          <div data-line="locked-full" contenteditable="false" class="locked-line" style="font-weight:700;">
            ${escapeHTML(line)}
          </div>
        `;
      }
      const m = line.match(titleRegex);
      if (!m) {
        return `<div data-line="free">${escapeHTML(line)}</div>`;
      }
      const rawLabel = (m[1] || "").trim();
      const content = m[2] ?? "";
      const isSec1 = section1Locked.includes(rawLabel.toUpperCase());

      const safeLabel = escapeHTML(rawLabel);
      const safeContent = escapeHTML(content);

      if (isSec1) {
        return `
          <div data-line="locked-full" contenteditable="false" class="locked-line" style="font-weight:700;">
            <span class="label" style="font-weight:700;" contenteditable="false">${safeLabel}:</span>${safeContent ? " " + safeContent : ""}
          </div>
        `;
      }
      return `
        <div data-line="partial">
          <span class="label" style="font-weight:700;" contenteditable="false">${safeLabel}:</span>
          <span class="value" data-edit="1">${safeContent}</span>
        </div>
      `;
    });

    return htmlLines.join("");
  };

  const getPlainFromDOM = () => {
    const root = rootRef.current;
    if (!root) return "";
    return (root.innerText || "").replace(/\r\n/g, "\n");
  };

  const emitPlainText = () => {
    onChange && onChange(getPlainFromDOM());
  };

  const handleKeyDown = (e) => {
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const { startContainer, startOffset } = range;

    const valueSpan = findAncestor(
      startContainer,
      (el) => el.nodeType === 1 && el.classList?.contains("value")
    );
    if (valueSpan && startOffset === 0 && e.key === "Backspace") {
      e.preventDefault();
      return;
    }

    if (e.key === "Backspace") {
      const lineDiv = findAncestor(
        startContainer,
        (el) => el.nodeType === 1 && el.dataset?.line
      );
      if (lineDiv) {
        const atLineStart =
          range.startOffset === 0 && range.startContainer === lineDiv.firstChild;
        if (atLineStart) {
          const prev = lineDiv.previousElementSibling;
          if (prev && prev.dataset.line === "locked-full") {
            e.preventDefault();
            return;
          }
        }
      }
    }
  };

  const handleBeforeInput = (e) => {
    if (e.inputType === "deleteContentBackward") {
      const sel = window.getSelection?.();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const lineDiv = findAncestor(
        range.startContainer,
        (el) => el.nodeType === 1 && el.dataset?.line
      );
      if (lineDiv) {
        const prev = lineDiv.previousElementSibling;
        if (prev && prev.dataset.line === "locked-full") {
          if (range.startOffset === 0) e.preventDefault();
        }
      }
    }
  };

  // Inyecta estilos una vez (usa variables --editor-min-h / --editor-max-h)
  useEffect(() => {
    const root = rootRef.current;
    if (!root || styleInjected.current) return;
    const style = document.createElement("style");
    style.textContent = `
      .editor-root {
        --editor-min-h: 40vh;
        --editor-max-h: 54vh;

        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        color: #111827;
        min-height: var(--editor-min-h);
        max-height: var(--editor-max-h);
        overflow-y: auto;
        position: relative;
        border-radius: 10px;
        transition: box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        font-size: 14px;
        line-height: 1.5;
      }
      .editor-root[data-editing="0"] {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: inset 0 0 0 1px rgba(0,0,0,0.02);
      }
      .editor-root[data-editing="1"] {
        background: #ffffff;
        border: 1px dashed #9ca3af;
        box-shadow: 0 0 0 2px rgba(0,0,0,0.04);
      }

      html.dark .editor-root {
        color: #e5e7eb;
      }
      html.dark .editor-root[data-editing="0"] {
        background: #1f2937;
        border: 1px solid #4b5563;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
      }
      html.dark .editor-root[data-editing="1"] {
        background: #1f2937;
        border: 1px dashed #6b7280;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.04);
      }

      .label {
        color: #111827;
        user-select: none;
        pointer-events: none;
        margin-right: 6px;
        white-space: pre;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 1px 6px;
        text-transform: uppercase;
      }
      html.dark .label {
        color: #e5e7eb;
        background: #1f2937;
        border: 1px solid #374151;
      }

      .locked-line {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-left: 3px solid #9ca3af;
        border-radius: 6px;
        padding: 2px 6px;
        opacity: 0.98;
      }
      html.dark .locked-line {
        background: #111827;
        border: 1px solid #374151;
        border-left: 3px solid #6b7280;
      }

      .value { white-space: pre-wrap; outline: none; }
      .editor-root[data-editing="1"] .value {
        background: #f8fafc;
        border-radius: 6px;
        padding: 1px 4px;
        border: 1px dashed #d1d5db;
      }
      html.dark .editor-root[data-editing="1"] .value {
        background: #0f172a;
        border: 1px dashed #475569;
      }

      [data-line="free"],
      [data-line="partial"],
      [data-line="locked-full"] {
        white-space: pre-wrap;
        padding: 2px 0;
      }

      [contenteditable="false"] { font-weight: 700 !important; }
      [data-line="locked-full"] { font-weight: 700 !important; }
      .locked-line, .locked-line * { font-weight: 700 !important; }
    `;
    root.appendChild(style);
    styleInjected.current = true;
  }, []);

  // Render + foco + altura
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // actualizar alturas por variables CSS
    root.style.setProperty("--editor-min-h", minHeight);
    root.style.setProperty("--editor-max-h", maxHeight);

    const currentPlain = (root.innerText || "").replace(/\r\n/g, "\n");
    if (currentPlain === (value || "")) {
      root.setAttribute("data-editing", editing ? "1" : "0");
      if (autoFocus && document.activeElement !== root) focusAtEnd(root);
      return;
    }

    root.innerHTML = toHTML(value);
    root.setAttribute("data-editing", editing ? "1" : "0");
    if (autoFocus) focusAtEnd(root);
  }, [value, editing, autoFocus, minHeight, maxHeight]);

  return (
    <div
      ref={rootRef}
      className="editor-root w-full h-full p-2 focus:outline-blue-400 dark:focus:outline-blue-500"
      contentEditable
      suppressContentEditableWarning
      onInput={emitPlainText}
      onKeyDown={handleKeyDown}
      onBeforeInput={handleBeforeInput}
      spellCheck={false}
      data-editing={editing ? "1" : "0"}
    />
  );
}

/* helpers */
function focusAtEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  el.scrollTop = el.scrollHeight;
}
function findAncestor(node, predicate) {
  let n = node && node.nodeType === 1 ? node : node?.parentNode;
  while (n) {
    if (predicate(n)) return n;
    n = n.parentNode;
  }
  return null;
}
function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
