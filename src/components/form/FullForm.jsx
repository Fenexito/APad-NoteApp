import { useFormStore } from "../../store/useFormStore";
import { buildNote } from "../../utils/noteBuilder";
import { splitNote } from "../../utils/splitNote";
import { useState, useMemo } from "react";
import Button from "../ui/Button";
import ModalFull from "../ui/ModalFull";
import ModalSplit from "../ui/ModalSplit";
import FormSection from "../ui/FormSection";
import MandatePanel from "../ui/MandatePanel";

export default function FullForm() {
  const data = useFormStore((s) => s.data);
  const update = useFormStore((s) => s.updateSection);

  const [showFull, setShowFull] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  const noteText = useMemo(() => buildNote(data), [data]);
  const parts = useMemo(() => splitNote(noteText), [noteText]);

  const openPreview = () => {
    parts.length === 1 ? setShowFull(true) : setShowSplit(true);
  };

  // conditional visibility
  const showXid = data.customer.caller === "Consultation";
  const showSecQ = ["Security Questions", "Manual Auth"].includes(
    data.customer.verifiedBy
  );

  const handleChange = (section) => (e) => {
    const { name, value } = e.target;
    update(section, { [name]: value });
  };

  return (
    <div className="mx-auto w-full max-w-[550px] space-y-3 px-2 pb-6">
      <FormSection title="Customer Information">
        <div className="grid grid-cols-3 xs:grid-cols-4 gap-2">
          {/* Row 1 */}
          {[
            ["BAN", "ban"],
            ["CID", "cid"],
            ["NAME", "name"],
            ["CBR", "cbr"],
          ].map(([label, key]) => (
            <label
              key={key}
              className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase"
            >
              {label}
              <input
                name={key}
                value={data.customer[key]}
                onChange={handleChange("customer")}
                className="rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
                autoComplete="off"
              />
            </label>
          ))}

          {/* Row 2 static fields */}
          <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
            CALLER
            <select
              name="caller"
              value={data.customer.caller}
              onChange={handleChange("customer")}
              className="rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
            >
              <option value="">—</option>
              <option>Owner</option>
              <option>Auth User</option>
              <option>Consultation</option>
              <option>Other</option>
            </select>
          </label>

          <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
            VERIFIED BY
            <select
              name="verifiedBy"
              value={data.customer.verifiedBy}
              onChange={handleChange("customer")}
              className="rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
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

          {/* Conditional SECURITY QUESTIONS */}
          {showSecQ && (
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              SECURITY QUESTIONS
              <input
                name="securityQuestions"
                value={data.customer.securityQuestions}
                onChange={handleChange("customer")}
                className="rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
                autoComplete="off"
              />
            </label>
          )}

          {/* Conditional XID */}
          {showXid && (
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              XID
              <input
                name="xid"
                value={data.customer.xid}
                onChange={handleChange("customer")}
                className="rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
                autoComplete="off"
              />
            </label>
          )}

          {/* ADDRESS always present */}
          <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
            ADDRESS
            <input
              name="address"
              value={data.customer.address}
              onChange={handleChange("customer")}
              className="rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
              autoComplete="off"
            />
          </label>
        </div>

        {/* Mandate switches panel */}
        <div className="mt-3">
          <MandatePanel />
        </div>
      </FormSection>

      {/* Placeholder for next big sections */}
      <FormSection title="Issue Details / Inspection / Resolution">
        <p className="text-xs text-gray-500">Sections will be migrated next.</p>
      </FormSection>

      <div className="flex justify-end">
        <Button
          className="rounded-md bg-green-600 px-5 py-1.5 text-white shadow-sm dark:bg-green-500"
          onClick={openPreview}
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