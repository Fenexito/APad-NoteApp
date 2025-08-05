import { useFormStore } from "../../store/useFormStore";
import { buildNote } from "../../utils/noteBuilder";
import { splitNote } from "../../utils/splitNote";
import { useState, useMemo } from "react";
import { Clipboard, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import Button from "../ui/Button";
import MultiCheckboxPopover from "../ui/MultiCheckboxPopover";
import ModalFull from "../ui/ModalFull";
import ModalSplit from "../ui/ModalSplit";
import FormSection from "../ui/FormSection";
import MandatePanel from "../ui/MandatePanel";

const copy = (txt) => navigator.clipboard.writeText(txt);

const emptyCustomer = {
  ban: "",
  cid: "",
  name: "",
  cbr: "",
  caller: "",
  verifiedBy: "",
  securityQuestions: "",
  address: "",
  xid: "",
};

export default function FullForm() {
  const data = useFormStore((s) => s.data);
  const update = useFormStore((s) => s.updateSection);

  const [showFull, setShowFull] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [openCust, setOpenCust] = useState(true);

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------
  const showXid = data.customer.caller === "Consultation";
  const showSecQ = ["Security Questions", "Manual Auth"].includes(
    data.customer.verifiedBy
  );
  const secQArr = data.customer.securityQuestions
    ? data.customer.securityQuestions.split(",")
    : [];

  const requiredMissing = {
    ban: !data.customer.ban,
    cid: !data.customer.cid,
    name: !data.customer.name,
    cbr: !data.customer.cbr,
    caller: !data.customer.caller,
    verifiedBy: !data.customer.verifiedBy,
    securityQuestions: showSecQ && secQArr.length < 3,
  };

  const handleChange = (section) => (e) => {
    const { name, value } = e.target;
    update(section, { [name]: value });
  };

  const clearCustomer = () => update("customer", { ...emptyCustomer });

  const renderInput = (label, key, extra = {}) => (
    <div className="relative flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
      <span className="inline-flex items-center gap-0.5">
        {label}
        {requiredMissing[key] && <span className="text-red-600">*</span>}
      </span>
      <input
        name={key}
        value={data.customer[key]}
        onChange={handleChange("customer")}
        className={`rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
          requiredMissing[key] ? "border-red-500" : "border-gray-300"
        }`}
        autoComplete="new-password"
        {...extra}
      />
      {['ban','cid','cbr'].includes(key) && (
        <button
          type="button"
          onClick={() => copy(data.customer[key] || "")}
          className="absolute right-0 top-0.5 text-gray-500 hover:text-black dark:hover:text-white"
          aria-label={`Copy ${label}`}
        >
          <Clipboard size={10} />
        </button>
      )}
    </div>
  );

  const noteText = useMemo(() => buildNote(data), [data]);
  const parts = useMemo(() => splitNote(noteText), [noteText]);

  const openPreview = () => {
    parts.length === 1 ? setShowFull(true) : setShowSplit(true);
  };

  // --------------------------------------------------
  // JSX
  // --------------------------------------------------
  return (
    <div className="mx-auto w-full max-w-[550px] space-y-3 px-2 pb-6">
      {/* ---------------- Customer Information ---------------- */}
      <FormSection>
        {/* Collapsible header */}
        <div
          className="mb-1 flex cursor-pointer items-center justify-between"
          onClick={() => setOpenCust(!openCust)}
        >
          <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Customer Information
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
            {/* Row 1 — fixed */}
            <div className="grid grid-cols-4 gap-2">
              {renderInput("BAN", "ban")}
              {renderInput("CID", "cid")}
              {renderInput("NAME", "name")}
              {renderInput("CBR", "cbr")}
            </div>

            {/* Row 2 — dynamic */}
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
                  value={data.customer.caller}
                  onChange={handleChange("customer")}
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
                  value={data.customer.verifiedBy}
                  onChange={handleChange("customer")}
                  className={`rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    requiredMissing.verifiedBy ? "border-red-500" : "border-gray-300"
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
                  {/* wrapper to apply border */}
                  <div
                    className={`rounded ${
                      requiredMissing.securityQuestions
                        ? "border-red-500"
                        : "border-gray-300"
                    } border`}
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
                        handleChange("customer")({
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

      {/* Placeholder for upcoming sections */}
      <FormSection title="Issue Details / Inspection / Resolution">
        <p className="text-xs text-gray-500">Sections will be migrated next.</p>
      </FormSection>

      {/* Preview Button */}
      <div className="flex justify-end pt-1">
        <Button
          className="rounded-md bg-green-600 px-5 py-1.5 text-white shadow-sm dark:bg-green-500 disabled:opacity-40"
          onClick={openPreview}
          disabled={Object.values(requiredMissing).some(Boolean)}
        >
          Preview Note
        </Button>
      </div>

      {/* Modals */}
      <ModalFull
        open={showFull}
        onClose={() => setShowFull(false)}
        text={noteText}
      />
      <ModalSplit
        open={showSplit}
        onClose={() => setShowSplit(false)}
        parts={parts}
      />
    </div>
  );
}
