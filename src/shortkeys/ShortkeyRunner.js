// src/shortkeys/ShortkeyRunner.js
import PopupManager from "./PopupManager";
import { loadShortcuts } from "./store";

// -------------------- Helpers de token/caret --------------------
function getCaretQueryData(text, caretPos) {
  // Devuelve el token @… activo con su rango {start, end} y el "query" sin '@'
  let i = caretPos - 1;
  while (i >= 0 && /\S/.test(text[i])) i--;
  const start = i + 1;
  const end = caretPos;
  const token = text.slice(start, end);
  if (!token.startsWith("@")) return null;
  return { query: token.slice(1), start, end };
}

function replaceRange(text, start, end, replacement) {
  return (text || "").slice(0, start) + replacement + (text || "").slice(end);
}

// -------------------- Helpers de render y limpieza --------------------
function renderTemplate(template, values) {
  // Reemplaza {id} por values[id] y si NO hay valor, lo borra (cadena vacía)
  const tpl = template || "";
  return tpl.replace(/\{([\w-]+)\}/g, (_, id) => {
    const has = values && Object.prototype.hasOwnProperty.call(values, id);
    const v = has ? values[id] : undefined;
    return v != null ? String(v) : "";
  });
}

function stripTokens(template) {
  return (template || "").replace(/\{[\w-]+\}/g, "");
}

function tidyText(text) {
  let out = text || "";
  out = out.replace(/\{[\w-]+\}/g, "");           // tokens sueltos
  out = out.replace(/[ \t]+([.,;:!?])/g, "$1");   // espacios antes de puntuación
  out = out.replace(/ {2,}/g, " ");               // espacios múltiples
  out = out.replace(/[ \t]+(\r?\n)/g, "$1");      // espacios EOL
  out = out.replace(/(\r?\n)[ \t]+/g, "$1");      // espacios BOL
  return out.trim();
}

// -------------------- Texto para el POPUP DE BÚSQUEDA --------------------
function buildPreview(shortcut) {
  try {
    const steps = shortcut.steps || [];
    const tpl = steps.find((s) => s.type === "template");
    if (!tpl) return "";

    const hasSelects = (steps || []).some((s) => s.type === "select");

    if (!hasSelects) {
      return tidyText(tpl.template || "");
    }

    // Con variables: NO pre-rellenar. Mostrar solo el texto fijo (sin {tokens})
    const fixed = stripTokens(tpl.template || "");
    return tidyText(fixed);
  } catch {
    return "";
  }
}

// -------------------- Flujo de interacción (selects secuenciales) --------------------
// Devuelve string final o null si el usuario CANCELA (Esc/clic fuera).
function runFlow(shortcut, element) {
  const steps = shortcut.steps || [];
  const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
  const tpl = steps.find((s) => s.type === "template");
  const start = steps.find((s) => s.type === "select" && s.id !== "result");

  if (!tpl) return "";
  if (!start) {
    return tidyText(tpl.template || "");
  }

  const values = {};
  let current = start;

  return new Promise((resolve) => {
    const pm = new PopupManager(
      element,
      onSelectOption,
      // onCancel: resuelve con null para que el runner NO inserte ni borre el @
      () => resolve(null)
    );

    pm.show(current.options || [], "interaction", current.prompt || "Selecciona…");

    function onSelectOption(opt) {
      values[current.id] = opt.value ?? opt.label ?? "";
      const next = opt.nextStep || "result";

      if (next === "result") {
        pm.destroy("normal");
        const raw = renderTemplate(tpl.template || "", values);
        const out = tidyText(raw);
        resolve(out);
        return;
      }

      const nextStep = byId[next];
      if (!nextStep) {
        pm.destroy("normal");
        const raw = renderTemplate(tpl.template || "", values);
        const out = tidyText(raw);
        resolve(out);
        return;
      }

      // Continuar al siguiente select
      current = nextStep;
      pm.show(current.options || [], "interaction", current.prompt || "Selecciona…");
    }
  });
}

/* -------------------- FIX: Confirmar hacia React -------------------- */
/** Confirma el nuevo valor en inputs/textarea controlados por React. */
function commitValueToReactInput(el, nextValue, caretPos) {
  // Intenta usar el setter nativo del prototipo (el que React intercepta)
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;

  const valueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (valueSetter) {
    valueSetter.call(el, nextValue);
  } else {
    // Fallback por si algún browser raro no expone el setter
    el.value = nextValue;
  }

  // Recoloca el caret (si aplica)
  if (typeof caretPos === "number") {
    try { el.setSelectionRange(caretPos, caretPos); } catch {}
  }

  // Dispara el evento de entrada que React escucha
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// -------------------- Runner --------------------
export function initShortkeyRunner({
  selector = "textarea.shortkey-enabled, input.shortkey-enabled",
} = {}) {
  // Evita inicializar dos veces
  if (window.__shortkeyRunnerInitialized) return;
  window.__shortkeyRunnerInitialized = true;

  document.addEventListener("input", async (e) => {
    const el = e.target;
    if (!(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) return;
    if (!el.matches(selector)) return;

    const shortcuts = loadShortcuts();
    const caretPos = el.selectionStart || 0;
    const text = el.value || "";

    const info = getCaretQueryData(text, caretPos);
    if (!info) return;

    const q = info.query;
    const tokenStart = info.start;
    const tokenEnd = info.end;

    // Lee etiquetas permitidas en el elemento (e.g. data-sk-tags="CX ISSUE, TS STEPS")
    const allowedTags = (el.getAttribute("data-sk-tags") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    // Filtro por key + (opcional) etiquetas
    const filtered = shortcuts
      .filter((s) => s.key && s.key.toLowerCase().startsWith(q.toLowerCase()))
      .filter((s) => {
        if (allowedTags.length === 0) return true; // si no especificas, acepta todos
        const skTags = (s.tags || []).map((t) => String(t).toUpperCase());
        return skTags.some((t) => allowedTags.includes(t));
      })
      .slice(0, 20);

    if (filtered.length === 0) return;

    // Mostrar popup de búsqueda
    const pm = new PopupManager(el, async (selected) => {
      // Lock per–element para evitar dobles ejecuciones por eventos duplicados
      if (el.__shortkeyRunning) return;
      el.__shortkeyRunning = true;

      try {
        pm.destroy("normal");
        // Ejecutar flujo (variables secuenciales)
        const output = await runFlow(selected, el);

        // Si el usuario canceló, no tocar el texto ni el token
        if (output === null) return;

        // Reemplazar el rango ORIGINAL del token por el resultado final ya “limpio”
        const currentText = el.value || "";
        const safeStart = Math.max(0, Math.min(tokenStart, currentText.length));
        const safeEnd = Math.max(safeStart, Math.min(tokenEnd, currentText.length));

        const nextText = replaceRange(currentText, safeStart, safeEnd, output);
        const newPos = safeStart + output.length;

        // === FIX aplicado aquí: confirmar hacia React ===
        commitValueToReactInput(el, nextText, newPos);
      } finally {
        el.__shortkeyRunning = false;
      }
    });

    pm.show(filtered.map((s) => ({ ...s, preview: buildPreview(s) })), "search");
  });
}
