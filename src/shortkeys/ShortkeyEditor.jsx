import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import ShortkeyFlowEditor from "./ShortkeyFlowEditor";

/* ============================ Utils ============================ */
const TAGS = ["GENERAL", "CX ISSUE", "TS STEPS", "AWA STEPS", "OTHER"];

function classesForTag(tag, selected) {
  const base =
    "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-semibold transition border";
  const palette = {
    GENERAL: selected
      ? "bg-slate-700 text-white border-slate-700 ring-2 ring-slate-400/70"
      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    "CX ISSUE": selected
      ? "bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300/70"
      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    "TS STEPS": selected
      ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300/70"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    "AWA STEPS": selected
      ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300/70"
      : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    OTHER: selected
      ? "bg-gray-700 text-white border-gray-700 ring-2 ring-gray-400/70"
      : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
  };
  return `${base} ${palette[tag] || ""}`;
}
function sanitizeKey(v) {
  return (v || "")
    .replace(/@/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_{2,}/g, "_"); // colapsa múltiples "_" pero permite "_" al final
}
function stripTemplateTokens(tpl) {
  if (!tpl) return "";
  return tpl.replace(/\{[\w-]+\}/g, "");
}
function renderTemplate(template, values) {
  if (!template) return "";
  return template.replace(/\{([\w-]+)\}/g, (_, id) => {
    const v = values?.[id];
    return v != null ? String(v) : `{${id}}`;
  });
}

// === Chips <-> Texto ===
function tplToHtmlWithChips(tpl) {
  if (!tpl) return "";
  // Escapar HTML básico
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Reemplazar tokens por chips
  return esc(tpl).replace(/\{([\w-]+)\}/g, (_m, id) =>
    `<span data-chip="1" data-id="${id}" contenteditable="false" class="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-[1px] text-[12px] font-medium text-blue-700 align-baseline">{${id}}</span>`
  );
}
function htmlWithChipsToTpl(rootEl) {
  if (!rootEl) return "";
  // Recorremos childNodes y reconstruimos texto con {id} donde haya chips
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
  let out = "";
  let n = walker.currentNode;
  while (n) {
    if (n.nodeType === 3) {
      out += n.nodeValue;
    } else if (n.nodeType === 1) {
      const el = /** @type {HTMLElement} */ (n);
      if (el.dataset && el.dataset.chip === "1" && el.dataset.id) {
        out += `{${el.dataset.id}}`;
        // No bajar a hijos: el contenido visible del chip no interesa
        n = walker.nextSibling() || walker.parentNode?.nextSibling;
        continue;
      } else if (el.tagName === "BR") {
        out += "\n";
      }
    }
    n = walker.nextNode();
  }
  // Normalizar espacios no separables
  return out.replace(/\u00a0/g, " ");
}

function buildPreview(steps) {
  const stepsById = Object.fromEntries((steps || []).map((s) => [s.id, s]));
  const start = (steps || []).find(
    (s) => s.type === "select" && s.id !== "result"
  );
  const tpl = (steps || []).find((s) => s.type === "template");
  if (!start) return tpl?.template || "";

  const values = {};
  let current = start;
  let safety = 0;

  while (current && safety++ < 200) {
    if (current.type === "select") {
      const first = current.options?.[0];
      if (!first) break;
      values[current.id] = first.value ?? first.label ?? "";
      const next = first.nextStep || "result";
      if (next === "result") break;
      current = stepsById[next];
    } else break;
  }
  return renderTemplate(tpl?.template || "", values);
}

function ensureTemplateStep(base) {
  const hasTpl = (base.steps || []).some((s) => s.type === "template");
  if (hasTpl) return base;
  return {
    ...base,
    steps: [...(base.steps || []), { id: "result", type: "template", template: "" }],
  };
}
function hasSelectSteps(steps) {
  return !!(steps || []).find((s) => s.type === "select");
}

/* ============================ Switch ON/OFF (compacto) ============================ */
/**
 * Estilo ON/OFF sencillo:
 * - Izquierda: SIMPLE (azul)
 * - Derecha: AVANZADO (rojo)
 * Thumb se desplaza izquierda/derecha
 */

function ModeSwitch({ advanced, onToggle, simpleDisabled }) {
  return (
    <div className="inline-flex rounded-full border border-slate-300 overflow-hidden shadow-sm">
      {/* Botón SIMPLE */}
      <button
        type="button"
        onClick={() => {
          if (advanced && simpleDisabled) return;
          onToggle(false);
        }}
        disabled={advanced && simpleDisabled}
        className={`
          px-4 py-1.5 text-[12px] font-semibold transition-colors
          ${!advanced
            ? "bg-blue-600 text-white"
            : "bg-white text-slate-600 hover:bg-blue-50"}
          ${advanced && simpleDisabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        SIMPLE
      </button>

      {/* Botón AVANZADO */}
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={`
          px-4 py-1.5 text-[12px] font-semibold transition-colors
          ${advanced
            ? "bg-rose-600 text-white"
            : "bg-white text-slate-600 hover:bg-rose-50"}
        `}
      >
        AVANZADO
      </button>
    </div>
  );
}

/* ============================ Editor ============================ */
export default function ShortkeyEditor({ value, onChange }) {
  // Normaliza draft con paso "result"
  const normalized = useMemo(
    () =>
      ensureTemplateStep(
        value || { key: "", tags: [], steps: [{ id: "result", type: "template", template: "" }] }
      ),
    [value]
  );

  // Estado del draft y modo
  const [draft, setDraft] = useState(normalized);

  const computeInitialAdvanced = (obj) => {
    const steps = obj?.steps || [];
    if (hasSelectSteps(steps)) return true;       // Si ya hay variables → avanzado
    if (obj?._forceSimple === true) return false; // Fuerza simple (cuando usuario cambió explícitamente)
    // Heurística: si hay tokens en template
    const tpl = steps.find((s) => s.type === "template")?.template || "";
    return /\{[\w-]+\}/.test(tpl);
  };

  const [advanced, setAdvanced] = useState(() => {
    // Preferimos SIMPLE por defecto salvo que ya existan variables
    if (normalized?._forceSimple === true) return false;
    return computeInitialAdvanced(normalized);
  });

  // 🔒 Importante: SOLO resetea cuando cambie _tempId (identidad estable de la sesión de edición)
  const prevTempRef = useRef(normalized?._tempId ?? null);
  useEffect(() => {
    const curTemp = normalized?._tempId ?? null;
    if (prevTempRef.current !== curTemp) {
      setDraft(normalized);
      if (normalized?._forceSimple === true) setAdvanced(false);
      else setAdvanced(computeInitialAdvanced(normalized));
      prevTempRef.current = curTemp;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized?._tempId]);

  // Refs de plantilla
  // Si usas textarea (modo anterior), deja tplRef.
  // Si usas editor con pastillas, usa tplChipRef.
  const tplRef = useRef(null);
  const tplChipRef = useRef(null); // 👈 evita "tplChipRef is not defined"

  // template + preview
  const tplText = useMemo(
    () => (draft.steps || []).find((s) => s.type === "template")?.template || "",
    [draft.steps]
  );
  const previewText = useMemo(
    () => (advanced ? buildPreview(draft.steps || []) : stripTemplateTokens(tplText)),
    [advanced, tplText, draft.steps]
  );

  // Si ya migraste a editor con pastillas, sincroniza HTML cuando cambie tplText
  useEffect(() => {
    if (!tplChipRef.current) return;
    const html = tplToHtmlWithChips(tplText);
    if (tplChipRef.current.innerHTML !== html) {
      tplChipRef.current.innerHTML = html;
    }
  }, [tplText]);

  // Sincroniza HTML del editor cuando cambie tplText (por ejemplo al renombrar IDs desde el Flow)
  useEffect(() => {
    if (!tplChipRef.current) return;
    const html = tplToHtmlWithChips(tplText);
    if (tplChipRef.current.innerHTML !== html) {
      tplChipRef.current.innerHTML = html;
    }
  }, [tplText]);

  // Commit centralizado
  const commit = (partial) => {
    const next = { ...draft, ...partial };

    // Si llegan steps, decide si hay variables y ajusta modo/banderas
    if (partial?.steps) {
      const hasVars = hasSelectSteps(partial.steps);
      if (hasVars) {
        if (!advanced) setAdvanced(true); // asegura avanzado si aparecen variables
        if (next._forceSimple) delete next._forceSimple; // ya no queremos volver a SIMPLE por "fuerza"
      }
    }

    setDraft(next);
    onChange?.(next);
  };

  // Actualiza solo la plantilla manteniendo los steps existentes (no borra variables)
  const updateTemplatePreservingSteps = (newTpl) => {
    const nextSteps = (draft.steps || []).map((s) =>
      s.type === "template" ? { ...s, template: newTpl } : s
    );
    commit({ steps: nextSteps });
  };

  // Inserta un token {id} en la posición del caret del textarea de plantilla
  const insertTokenAtCaret = (idOrToken) => {
    const token = String(idOrToken || "").startsWith("{") ? String(idOrToken) : `{${idOrToken}}`;
    const el = tplRef.current;
    let start = tplText.length;
    let end = tplText.length;
    if (el && typeof el.selectionStart === "number") {
      start = el.selectionStart;
      end = el.selectionEnd ?? el.selectionStart;
    }
    const nextText = (tplText || "").slice(0, start) + token + (tplText || "").slice(end);
    updateTemplatePreservingSteps(nextText);
    // reposicionar caret al final del token insertado
    requestAnimationFrame(() => {
      try {
        if (el) {
          el.focus();
          const caret = start + token.length;
          el.setSelectionRange(caret, caret);
        }
      } catch {}
    });
  };

  // ¿SIMPLE disponible?
  const simpleDisabled = hasSelectSteps(draft.steps);

  // Toggle de modo
  const handleToggleMode = (toAdvanced) => {
    if (!toAdvanced) {
      // Ir a SIMPLE
      if (simpleDisabled) return; // bloqueado si existen variables
      const cleaned = stripTemplateTokens(tplText);
      const onlyTpl = [{ id: "result", type: "template", template: cleaned }];
      commit({ steps: onlyTpl, _forceSimple: true });
      setAdvanced(false);
    } else {
      // Ir a AVANZADO
      commit({ _forceSimple: false });
      setAdvanced(true);
    }
  };

  // Helpers UI
  const toggleTag = (tag) => {
    const exists = (draft.tags || []).includes(tag);
    const nextTags = exists ? (draft.tags || []).filter((t) => t !== tag) : [...(draft.tags || []), tag];
    commit({ tags: nextTags });
  };

  // === UI ===
  return (
    <div className={`w-full ${advanced ? "max-w-none px-2" : "mx-auto max-w-[580px] px-3"}`}>
      {/* Header editor + switch */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-blue-700 dark:text-blue-300">Editor de Shortkey</h3>
        <ModeSwitch advanced={advanced} onToggle={handleToggleMode} simpleDisabled={simpleDisabled} />
      </div>

      {/* === Barra superior en una fila (AVANZADO) === */}
      {advanced && (
        <div className="mb-2 grid grid-cols-12 gap-3">
          {/* Activador */}
          <div className="col-span-12 md:col-span-3">
            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              Activador (<span className="font-mono">@key</span>)
            </label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-md border border-blue-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-600 px-2 py-1">
                @
              </span>
              <input
                value={draft.key || ""}
                onKeyDown={(e) => {
                  if (e.key === " ") {
                    e.preventDefault();
                    const el = e.currentTarget;
                    const cur = draft.key || "";
                    const start = el.selectionStart ?? cur.length;
                    const end = el.selectionEnd ?? start;
                    const next =
                      cur.slice(0, start) + "_" + cur.slice(end);
                    commit({ key: sanitizeKey(next) });
                    requestAnimationFrame(() => {
                      try { el.setSelectionRange(start + 1, start + 1); } catch {}
                    });
                  }
                }}
                onChange={(e) => commit({ key: sanitizeKey(e.target.value) })}
                placeholder="nombre-del-shortkey"
                className={`w-full rounded-md border ${
                  !draft.key
                    ? "border-red-400 focus:ring-red-300"
                    : "border-blue-200/60 dark:border-slate-700 focus:ring-blue-300"
                } bg-white/70 dark:bg-slate-800/70 px-3 py-1.5 text-[13px] outline-none focus:ring-2`}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Etiquetas */}
          <div className="col-span-12 md:col-span-3">
            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => {
                const selected = (draft.tags || []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTag(t)}
                    className={classesForTag(t, selected)}
                    title={t}
                  >
                    {selected && <Check size={14} className="shrink-0" />}
                    <span className="truncate">{t}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plantilla final (con pastillas) */}
          <div className="col-span-12 md:col-span-3">
            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              Plantilla final
            </label>
            <div
              ref={tplChipRef}
              contentEditable
              suppressContentEditableWarning
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const token = e.dataTransfer?.getData("text/plain");
                if (!token) return;
                // Insertar como chip en caret
                document.execCommand("insertHTML", false, tplToHtmlWithChips(token));
                // Sincronizar a texto
                const nextTpl = htmlWithChipsToTpl(tplChipRef.current);
                updateTemplatePreservingSteps(nextTpl);
              }}
              onInput={() => {
                const nextTpl = htmlWithChipsToTpl(tplChipRef.current);
                updateTemplatePreservingSteps(nextTpl);
              }}
              onPaste={(e) => {
                // Pegar como texto plano (convertiremos tokens a chips en render)
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain") || "";
                document.execCommand("insertText", false, text);
              }}
              className="w-full min-h-[84px] rounded-md border border-blue-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-300 whitespace-pre-wrap"
              placeholder="Texto final. Usa {id_variable}"
            />
            {/* Variables disponibles para insertar */}
            <div className="mt-2 flex flex-wrap gap-2">
              {(draft.steps || [])
                .filter((s) => s.type === "select")
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    draggable
                    onDragStart={(e) => e.dataTransfer?.setData("text/plain", `{${s.id}}`)}
                    onClick={() => {
                      // Insertar chip en caret
                      tplChipRef.current?.focus();
                      document.execCommand("insertHTML", false, tplToHtmlWithChips(`{${s.id}}`));
                      const nextTpl = htmlWithChipsToTpl(tplChipRef.current);
                      updateTemplatePreservingSteps(nextTpl);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[12px] font-medium text-blue-700 hover:bg-blue-100"
                    title={`Insertar {${s.id}}`}
                  >
                    {"{"}{s.id}{"}"}
                  </button>
                ))}
              {(draft.steps || []).filter((s) => s.type === "select").length === 0 && (
                <span className="text-[12px] text-slate-400">
                  Crea variables en el Flow para usarlas aquí.
                </span>
              )}
            </div>
          </div>

          {/* Vista previa */}
          <div className="col-span-12 md:col-span-3">
            <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Vista previa
            </label>
            <div className="rounded-lg border border-blue-100 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-100 whitespace-pre-wrap min-h-[72px] px-3 py-2">
              {previewText || <span className="text-slate-400">Sin contenido…</span>}
            </div>
          </div>
        </div>
      )}

      {/* === Layout SIMPLE (en FILAS) === */}
      {!advanced && (
        <div className="space-y-4">
          {/* FILA 1: Activador */}
          <div>
            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              Activador (<span className="font-mono">@key</span>)
            </label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-md border border-blue-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-600 px-2 py-1">
                @
              </span>
              <input
                value={draft.key || ""}
                onChange={(e) => commit({ key: sanitizeKey(e.target.value) })}
                placeholder="nombre-del-shortkey"
                className={`w-full rounded-md border ${
                  !draft.key
                    ? "border-red-400 focus:ring-red-300"
                    : "border-blue-200/60 dark:border-slate-700 focus:ring-blue-300"
                } bg-white/70 dark:bg-slate-800/70 px-3 py-1.5 text-[13px] outline-none focus:ring-2`}
                autoComplete="off"
              />
            </div>
          </div>

          {/* FILA 2: Etiquetas */}
          <div>
            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => {
                const selected = (draft.tags || []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTag(t)}
                    className={classesForTag(t, selected)}
                    title={t}
                  >
                    {selected && <Check size={14} className="shrink-0" />}
                    <span className="truncate">{t}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FILA 3: Plantilla final (SIMPLE: sin variables) */}
          <div>
            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              Plantilla final
            </label>
            <textarea
              rows={6}
              value={tplText}
              onChange={(e) =>
                commit({
                  steps: [
                    {
                      id: "result",
                      type: "template",
                      template: stripTemplateTokens(e.target.value),
                    },
                  ],
                })
              }
              placeholder="Escribe el texto que se insertará…  (en SIMPLE no se permiten variables)"
              className="w-full rounded-md border border-blue-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* FILA 4: Vista previa */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Vista previa
            </label>
            <div className="rounded-lg border border-blue-100 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-100 whitespace-pre-wrap min-h-[72px] px-3 py-2">
              {previewText || <span className="text-slate-400">Sin contenido…</span>}
            </div>
          </div>

          {/* Ayuda (SIMPLE) */}
          <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 px-3 py-2">
            <p className="text-[12px] text-slate-600 dark:text-slate-300">
              Modo <b>SIMPLE</b>: no admite variables. Si necesitas variables y ramificaciones, cambia a{" "}
              <b>AVANZADO</b> en el conmutador de arriba.
            </p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              Escribe <span className="font-mono">@key</span> en tus campos para desplegar el popup y usar el shortkey.
            </p>
          </div>
        </div>
      )}

      {/* === Flow (solo avanzado) === */}
      {advanced && (
        <>
          <ShortkeyFlowEditor
            value={draft}
            onChange={(next) => {
              // Si desde el Flow llegan variables, garantizamos modo avanzado y limpiamos _forceSimple
              if (hasSelectSteps(next.steps)) {
                if (!advanced) setAdvanced(true);
                if (next._forceSimple) delete next._forceSimple;
              }
              setDraft(next);
              onChange?.(next);
            }}
          />

          {/* Ayuda (AVANZADO) */}
          <div className="mt-4 rounded-md border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-900/20 px-3 py-2">
            <p className="text-[12px] text-rose-800 dark:text-rose-200">
              Modo <b>AVANZADO</b>: crea variables (pasos <span className="font-mono">select</span>) y ramificaciones; inserta tokens como <span className="font-mono">{'{variable}'}</span> en la plantilla final.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
