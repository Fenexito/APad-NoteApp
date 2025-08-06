import { useState, useMemo } from "react";
import {
  Clipboard,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { useFormStore } from "../../../store/useFormStore";
import MultiCheckboxPopover from "../../ui/MultiCheckboxPopover";
import FormSection from "../../ui/FormSection";
import MandatePanel from "../../ui/MandatePanel";

export default function Section1() {
  // Zustand store
  const data = useFormStore((s) => s.data.customer);
  const update = useFormStore((s) => s.updateSection);

  // UI state
  const [openCust, setOpenCust] = useState(true);
  const copy = (txt) => navigator.clipboard.writeText(txt);

  // Lógica condicional y requeridos
  const showXid = data.caller === "Consultation";
  const showSecQ = ["Security Questions", "Manual Auth"].includes(
    data.verifiedBy
  );
  const secQArr = data.securityQuestions ? data.securityQuestions.split(",") : [];

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
    const { name, value } = e.target;
    update("customer", { [name]: value });
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
      phone: "",
      accountId: "",
    });

  const renderInput = (label, key, extra = {}) => (
    <div className="relative flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
      <span className="inline-flex items-center gap-0.5">
        {label}
        {requiredMissing[key] && <span className="text-red-600">*</span>}
      </span>
      <input
        name={key}
        value={data[key]}
        onChange={handleChange}
        className={`rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
          requiredMissing[key] ? "border-red-500" : "border-gray-300"
        }`}
        autoComplete="new-password"
        {...extra}
      />
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

  // JSX
  return (
    <FormSection>
      {/* Encabezado colapsable */}
      <div
        className="mb-1 flex cursor-pointer items-center justify-between"
        onClick={() => setOpenCust(!openCust)}
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
            {openCust ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {openCust && (
        <>
          {/* Fila 1 */}
          <div className="grid grid-cols-4 gap-2">
            {renderInput("BAN", "ban")}
            {renderInput("CID", "cid")}
            {renderInput("NAME", "name")}
            {renderInput("CBR", "cbr")}
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
                      "Billing Address & Postal Code",
                    ]}
                    value={secQArr}
                    onChange={(arr) =>
                      handleChange({
                        target: {
                          name: "securityQuestions",
                          value: arr.join(","),
                        },
                      })
                    }
                  />
                </div>
              </label>
            )}

            {/* XID */}
            {showXid && renderInput("XID", "xid")}

            {/* ADDRESS */}
            {renderInput("ADDRESS", "address")}
          </div>

          <div className="mt-2">
            <MandatePanel />
          </div>
        </>
      )}
    </FormSection>
  );
}
