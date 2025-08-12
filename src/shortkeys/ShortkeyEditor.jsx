// src/shortkeys/ShortkeyEditor.jsx
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

/* ============================ Switch ============================ */
function ModeSwitch({ advanced, onToggle, simpleDisabled }) {
  const canToggleToSimple = !simpleDisabled;

  return (
    <button
      type="button"
      aria-pressed={advanced}
      onClick={() => {
        if (advanced && !canToggleToSimple) return; // bloquea ir a SIMPLE si hay variables
        onToggle(!advanced);
      }}
      className={`group relative inline-flex items-center h-8 w-[210px] rounded-full border transition
      ${advanced ? "justify-end border-emerald-300 bg-emerald-50 dark:bg-emerald-900/30" : "justify-start border-slate-300 bg-slate-50 dark:bg-slate-800/40"}
      ${advanced && simpleDisabled ? "cursor-not-allowed" : ""}`}
      title={
        advanced
          ? (simpleDisabled ? "SIMPLE no disponible: este shortkey usa variables." : "Cambiar a SIMPLE")
          : "Cambiar a AVANZADO"
      }
      aria-disabled={advanced && simpleDisabled}
    >
      <span
        className={`absolute inset-0 m-0.5 rounded-full transition
        ${advanced ? "bg-emerald-500/10" : "bg-slate-400/10"}`}
      />
      <span
        className={`relative z-10 mx-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-semibold
        ${advanced ? "bg-emerald-600 text-white" : "bg-slate-600 text-white"}`}
      >
        {advanced ? "AVANZADO" : "SIMPLE"}
      </span>
    </button>
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

  // Ref para textarea de plantilla (avanzado)
  const tplRef = useRef(null);

  // template + preview
  const tplText = useMemo(
    () => (draft.steps || []).find((s) => s.type === "template")?.template || "",
    [draft.steps]
  );
  const previewText = useMemo(
    () => (advanced ? buildPreview(draft.steps || []) : stripTemplateTokens(tplText)),
    [advanced, tplText, draft.steps]
  );

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

          {/* Plantilla final */}
          <div className="col-span-12 md:col-span-3">
            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1">
              Plantilla final
            </label>
            <textarea
              rows={3}
              ref={tplRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const token = e.dataTransfer?.getData("text/plain");
                if (token) insertTokenAtCaret(token);
              }}
              value={tplText}
              onChange={(e) => updateTemplatePreservingSteps(e.target.value)}
              placeholder="Texto final. Usa {id_variable}"
              className="w-full rounded-md border border-blue-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-300"
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
                    onClick={() => insertTokenAtCaret(s.id)}
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

      {/* === Layout SIMPLE (sin Flow) === */}
      {!advanced && (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-3">
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

            {/* Plantilla final (SIMPLE: sin variables) */}
            <div className="col-span-12 md:col-span-3">
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

          <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 px-3 py-2">
            <p className="text-[12px] text-slate-600 dark:text-slate-300">
              Modo SIMPLE: no admite variables. Si necesitas variables y ramificaciones, cambia a{" "}
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
      )}
    </div>
  );
}
