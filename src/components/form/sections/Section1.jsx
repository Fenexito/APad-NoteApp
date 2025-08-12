import { useMemo } from "react";
import {
  Clipboard,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import useFormStore from "../../../store/useFormStore";
import MultiCheckboxPopover from "../../ui/MultiCheckboxPopover";
import FormSection from "../../ui/FormSection";
import CollapsibleChecklist from "../../ui/CollapsibleChecklist";

export default function Section1({ open, onToggle }) {
  const data = useFormStore((s) => s.data.customer);
  const update = useFormStore((s) => s.updateSection);

  const resetCount = useFormStore((s) => s.resetCount);

  const copy = (txt) => navigator.clipboard.writeText(txt);

  // Lógica condicional y requeridos
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

  // Handlers
  const handleChange = (e) => {
      const tgt = e?.target ?? e ?? {};
      const { value = "", dataset = {}, name = "" } = tgt;
      const key = (dataset && dataset.key) || name; // prioriza data-key si existe
      const numericKeys = ["ban", "cid", "cbr"];
      const nextValue = numericKeys.includes(key)
        ? String(value).replace(/\D/g, "") // solo dígitos
        : value;
      if (!key) return; // guard: evita romper si llega sin clave
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
        <form
          autoComplete="off"
          onSubmit={(e) => e.preventDefault()}
          className="contents"
        >
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
            name={isNoAuto ? `noauto-${key}` : key}   /* evita gatillar autofill por nombre */
            data-key={key}                             /* clave real para el estado */
            value={data[key]}
            onChange={handleChange}
            className={`rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
              requiredMissing[key] ? "border-red-500" : "border-gray-300"
            }`}
            /* BLOQUEO AGRESIVO DE AUTOFILL */
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
    <FormSection>
      {/* Encabezado colapsable */}
      <div
        className="mb-1 flex cursor-pointer items-center justify-between"
        onClick={onToggle}
      >
        <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          ACCOUNT INFO & VERIFICATION
        </h3>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
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
        <>
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
              showXid && showSecQ
                ? "grid-cols-5"
                : showXid || showSecQ
                ? "grid-cols-4"
                : "grid-cols-3"
            }`}
          >
            {/* CALLER */}
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span className="inline-flex items-center gap-0.5">
                CALLER{requiredMissing.caller && (
                  <span className="text-red-600">*</span>
                )}
              </span>
              <select
                name="caller"
                value={data.caller}
                onChange={handleChange}
                className={`rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.caller ? "border-red-500" : "border-gray-300"
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
                VERIFIED BY{requiredMissing.verifiedBy && (
                  <span className="text-red-600">*</span>
                )}
              </span>
              <select
                name="verifiedBy"
                value={data.verifiedBy}
                onChange={handleChange}
                className={`rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.verifiedBy
                    ? "border-red-500"
                    : "border-gray-300"
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
                  SECURITY QUESTIONS{requiredMissing.securityQuestions && (
                    <span className="text-red-600">*</span>
                  )}
                </span>
                <div
                  className={`rounded border ${
                    requiredMissing.securityQuestions
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                >
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
                    onChange={(arr) => {
                      // Normaliza selección: trim, sin duplicados, sin vacíos
                      const normalized = Array.from(
                        new Set(arr.map((s) => String(s).trim()).filter(Boolean))
                      );
                      handleChange({
                        target: {
                          name: "securityQuestions",
                          dataset: { key: "securityQuestions" },
                          value: normalized.join(", "),
                        },
                      });
                    }}
                  />
                </div>
              </label>
            )}

            {/* XID */}
            {showXid && renderInput("XID", "xid", { autoComplete: "off" })}

            {/* ADDRESS */}
            {renderInput("ADDRESS", "address")}
          </div>

          <div className="mt-2">
            <CollapsibleChecklist section={1} key={resetCount + "-1"} />
          </div>
        </>
      )}
    </FormSection>
  );
}
