// src/components/form/sections/Section1.jsx
import { useMemo, useEffect, useRef, useState } from "react";
import { Clipboard, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import useFormStore from "../../db/useFormStore";
import MultiCheckboxPopover from "../../ui/MultiCheckboxPopover";
import FormSection from "../../ui/FormSection";
import CollapsibleChecklist from "../../ui/CollapsibleChecklist";

export default function Section1({
  open,
  onToggle,
  // Indicador de estado (se pinta en el header)
  statusComplete,
  statusIndicatorTitle,
  statusIndicatorClasses,
  // Borde friendly cuando la sección está cerrada
  closedBorderClass,
  // Control del Mandate (Excellence)
  mandateCompleted = false,
  mandateDefaultOpen = true,
  mandateResetSignal = 0,
}) {
  const data = useFormStore((s) => s.data.customer);
  const update = useFormStore((s) => s.updateSection);
  const resetCount = useFormStore((s) => s.resetCount);

  // === perfil de validación global (ui.validationProfile) ===
  const profile = useFormStore((s) => s.data.ui?.validationProfile || "strict");
  const setProfile = (p) => update("ui", { validationProfile: p });

  const copy = (txt) => navigator.clipboard.writeText(txt);

  // Lógica condicional y requeridos (S1 SIEMPRE estricta)
  const showXid = data.caller === "Consultation";
  const showSecQ = ["Security Questions", "Manual Auth"].includes(data.verifiedBy);

  // Normaliza el string guardado: separa por coma, recorta espacios y elimina vacíos
  const secQArr = useMemo(
    () =>
      (data.securityQuestions || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [data.securityQuestions]
  );

  const requiredMissing = useMemo(
    () => ({
      ban: !data.ban,
      cid: !data.cid,
      name: !data.name,
      cbr: !data.cbr,
      caller: !data.caller,
      verifiedBy: !data.verifiedBy,
      securityQuestions: showSecQ && secQArr.length < 3,
    }),
    [data, showSecQ, secQArr]
  );

  // ✅ Auto-colapso con 1s de espera y 300ms de animación (scaleY + fade)
  const allRequiredComplete = useMemo(
    () => Object.values(requiredMissing).every((v) => !v),
    [requiredMissing]
  );
  const collapseTimerRef = useRef(null); // espera (1s)
  const animTimerRef = useRef(null);     // animación (300ms)
  const [autoClosing, setAutoClosing] = useState(false);
  const [autoCollapseDisabled, setAutoCollapseDisabled] = useState(false);
  const ANIM_MS = 300;

  // Re-habilitar auto-colapso cuando pase de incompleta→completa tras edición
  const prevCompleteRef = useRef(allRequiredComplete);
  useEffect(() => {
    const wasComplete = prevCompleteRef.current;
    if (!wasComplete && allRequiredComplete) {
      setAutoCollapseDisabled(false);
    }
    prevCompleteRef.current = allRequiredComplete;
  }, [allRequiredComplete]);

  useEffect(() => {
    if (collapseTimerRef.current) { clearTimeout(collapseTimerRef.current); collapseTimerRef.current = null; }
    if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
    if (open && allRequiredComplete && !autoCollapseDisabled) {
      collapseTimerRef.current = setTimeout(() => {
        setAutoClosing(true);
        animTimerRef.current = setTimeout(() => {
          if (open) onToggle();
          setAutoClosing(false);
        }, ANIM_MS);
      }, 1000);
    } else {
      setAutoClosing(false);
    }
    return () => {
      if (collapseTimerRef.current) { clearTimeout(collapseTimerRef.current); collapseTimerRef.current = null; }
      if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
    };
  }, [open, allRequiredComplete, autoCollapseDisabled, onToggle]);

  // Handlers
  const handleChange = (e) => {
    const tgt = e?.target ?? e ?? {};
    const { value = "", dataset = {}, name = "" } = tgt;
    const key = (dataset && dataset.key) || name;
    const numericKeys = ["ban", "cid", "cbr"];
    const nextValue = numericKeys.includes(key)
      ? String(value).replace(/\D/g, "")
      : value;
    if (!key) return;
    update("customer", { [key]: nextValue });
  };

  const clearCustomer = () =>
    update("customer", {
      ban: "",
      cid: "",
      name: "",
      cbr: "",
      caller: "",
      verifiedBy: "",
      securityQuestions: "",
      address: "",
      xid: "",
    });

  const renderInput = (label, key, extra = {}) => {
    const isNoAuto = key === "name" || key === "address";
    return (
      <div className="relative flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
        <span className="inline-flex items-center gap-0.5">
          {label}
          {requiredMissing[key] && <span className="text-red-600">*</span>}
        </span>

        {/* Para NAME / ADDRESS envolvemos en un form con autoComplete off (display: contents) */}
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="contents">
          {/* Señuelo password para cortar heurísticas de autofill */}
          {isNoAuto && (
            <input
              type="password"
              className="hidden"
              tabIndex={-1}
              autoComplete="new-password"
              aria-hidden="true"
            />
          )}

          <input
            name={isNoAuto ? `noauto-${key}` : key}
            data-key={key}
            value={data[key]}
            onChange={handleChange}
            className={`rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
              requiredMissing[key] ? "border-red-500 dark:border-red-500" : "border-gray-300"
            }`}
            autoComplete={isNoAuto ? "new-password" : "off"}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            readOnly={isNoAuto ? true : undefined}
            onFocus={(e) => {
              if (isNoAuto) e.currentTarget.removeAttribute("readonly");
              e.currentTarget.setAttribute("autocomplete", "new-password");
            }}
            data-lpignore="true"
            data-1p-ignore
            data-bwignore="true"
            data-form-type="other"
            data-gramm="false"
            enterKeyHint="done"
            {...extra}
          />
        </form>

        {["ban", "cid", "cbr"].includes(key) && (
          <button
            type="button"
            onClick={() => copy(data[key] || "")}
            className="absolute right-0 top-0.5 text-gray-500 hover:text-black dark:hover:text-white"
            aria-label={`Copy ${label}`}
          >
            <Clipboard size={10} />
          </button>
        )}
      </div>
    );
  };

  // --- RENDER ---
  return (
    <FormSection className={`${!open ? closedBorderClass : ""} relative z-40 overflow-visible`}>
      {/* Encabezado colapsable */}
      <div
        className="mb-1 flex cursor-pointer items-center justify-between"
        onClick={() => {
          if (!open) setAutoCollapseDisabled(true);
          if (collapseTimerRef.current) { clearTimeout(collapseTimerRef.current); collapseTimerRef.current = null; }
          if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
          setAutoClosing(false);
          onToggle();
        }}
      >
        <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          ACCOUNT INFO & VERIFICATION
        </h3>

        {/* === CHIP STRICT / EXPRESS (centrado, entre título y acciones) === */}
        <div className="mx-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setProfile(profile === "express" ? "strict" : "express")}
            title="Toggle validation profile"
            className={
              "rounded-full border px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide " +
              (profile === "express"
                ? "border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-900/20"
                : "border-gray-300 text-gray-600 bg-white dark:bg-gray-800")
            }
          >
            {profile === "express" ? "EXPRESS MODE" : "STRICT"}
          </button>
        </div>

        {/* Acciones derecha del título (status + limpiar + caret) */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span
            className={statusIndicatorClasses}
            title={statusComplete ? "Section complete" : "Section incomplete"}
            aria-label={statusComplete ? "Section complete" : "Section incomplete"}
          >
            {statusIndicatorTitle}
          </span>

          <button
            type="button"
            onClick={clearCustomer}
            className="text-red-500 hover:text-red-700"
            aria-label="Clear section"
          >
            <Trash2 size={14} />
          </button>

          <button type="button" className="text-blue-600 dark:text-blue-400">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          /* Evita colapsar mientras hay foco dentro de la sección;
             colapsa al salir si ya está completa */
          onFocusCapture={() => setAutoCollapseDisabled(true)}
          onBlurCapture={(e) => {
            const leftSection = !e.currentTarget.contains(e.relatedTarget);
            if (leftSection) {
              setAutoCollapseDisabled(false);
              if (allRequiredComplete) { setAutoClosing(true); setTimeout(() => { if (open) onToggle(); setAutoClosing(false); }, ANIM_MS); }
            }
          }}
          className={
            autoClosing
              ? "transform-gpu origin-top scale-y-0 opacity-0 transition-all duration-300 ease-out overflow-hidden"
              : "transform-gpu origin-top scale-y-100 opacity-100 transition-all duration-300 ease-out"
          }
        >
          {/* Autofill bait (invisible): evita que Chrome rellene NAME/ADDRESS reales */}
          <div aria-hidden="true" className="h-0 overflow-hidden">
            <input type="text" name="name" autoComplete="name" tabIndex={-1} />
            <input type="text" name="address" autoComplete="street-address" tabIndex={-1} />
          </div>

          {/* Fila 1 */}
          <div className="grid grid-cols-4 gap-2">
            {renderInput("BAN", "ban", { inputMode: "numeric", pattern: "[0-9]*", autoComplete: "off" })}
            {renderInput("CID", "cid", { inputMode: "numeric", pattern: "[0-9]*", autoComplete: "off" })}
            {renderInput("NAME", "name")}
            {renderInput("CBR", "cbr", { inputMode: "numeric", pattern: "[0-9]*", autoComplete: "off" })}
          </div>

          {/* Fila 2 dinámica */}
          <div
            className={`mt-2 grid gap-2 ${
              showXid && showSecQ ? "grid-cols-5" : showXid || showSecQ ? "grid-cols-4" : "grid-cols-3"
            }`}
          >
            {/* CALLER */}
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span className="inline-flex items-center gap-0.5">
                CALLER{requiredMissing.caller && <span className="text-red-600">*</span>}
              </span>
              <select
                name="caller"
                value={data.caller}
                onChange={handleChange}
                className={`rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.caller ? "border-red-500 dark:border-red-500" : "border-gray-300"
                }`}
                autoComplete="off"
              >
                <option value="">—</option>
                <option>Owner</option>
                <option>Auth User</option>
                <option>Consultation</option>
                <option>Other</option>
              </select>
            </label>

            {/* VERIFIED BY */}
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span className="inline-flex items-center gap-0.5">
                VERIFIED BY{requiredMissing.verifiedBy && <span className="text-red-600">*</span>}
              </span>
              <select
                name="verifiedBy"
                value={data.verifiedBy}
                onChange={handleChange}
                className={`rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.verifiedBy ? "border-red-500 dark:border-red-500" : "border-gray-300"
                }`}
                autoComplete="off"
              >
                <option value="">—</option>
                <option>PIN</option>
                <option>IVR</option>
                <option>Security Questions</option>
                <option>Manual Auth</option>
                <option>Previous Agent</option>
                <option>N/Refuses to Verify</option>
                <option>N/Missing Info</option>
                <option>N/Not Owner or Auth User</option>
                <option>Not Required</option>
              </select>
            </label>

            {/* SECURITY QUESTIONS */}
            {showSecQ && (
              <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
                <span className="inline-flex items-center gap-0.5">
                  SECURITY QUESTIONS{requiredMissing.securityQuestions && <span className="text-red-600">*</span>}
                </span>
                <MultiCheckboxPopover
                  label="Select..."
                  options={[
                    "DOB",
                    "SIN",
                    "DL",
                    "CC",
                    "Primary Phone #",
                    "Secondary Phone #",
                    "Email Address",
                    "Address & Postal Code",
                  ]}
                  value={secQArr}
                  missing={!!requiredMissing.securityQuestions}
                  onChange={(arr) => {
                    const normalized = Array.from(new Set(arr.map((s) => String(s).trim()).filter(Boolean)));
                    handleChange({
                      target: {
                        name: "securityQuestions",
                        dataset: { key: "securityQuestions" },
                        value: normalized.join(", "),
                      },
                    });
                  }}
                />
              </label>
            )}

            {/* XID */}
            {showXid && renderInput("XID", "xid", { autoComplete: "off" })}

            {/* ADDRESS */}
            {renderInput("ADDRESS", "address")}
          </div>
        </div>
      )}
    </FormSection>
  );
}
