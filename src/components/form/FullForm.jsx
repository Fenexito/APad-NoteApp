import { useFormStore } from "../../store/useFormStore";
import { buildNote } from "../../utils/noteBuilder";
import { splitNote } from "../../utils/splitNote";
import { useState, useMemo } from "react";
import { Clipboard } from "lucide-react";
import Button from "../ui/Button";
import ModalFull from "../ui/ModalFull";
import ModalSplit from "../ui/ModalSplit";
import FormSection from "../ui/FormSection";
import MandatePanel from "../ui/MandatePanel";

const copy = (txt) => navigator.clipboard.writeText(txt);

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
        <div className="grid auto-cols-fr grid-flow-col grid-cols-3 xs:grid-cols-4 gap-2">
          {[
            ["BAN", "ban"],
            ["CID", "cid"],
            ["NAME", "name"],
            ["CBR", "cbr"],
          ].map(([label, key]) => (
            <div key={key} className="relative flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>{label}</span>
              <input
                name={key}
                value={data.customer[key]}
                onChange={handleChange("customer")}
                className="rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => copy(data.customer[key] || "")}
                className="absolute right-0 top-0.5 text-gray-500 hover:text-black dark:hover:text-white"
                aria-label={`Copy ${label}`}
              >
                <Clipboard size={10} />
              </button>
            </div>
          ))}

          {/* Row 2 dynamic */}
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

          {showSecQ && (
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              SECURITY QUESTIONS
              <select
                multiple
                name="securityQuestions"
                value={data.customer.securityQuestions.split(",")}
                onChange={(e) =>
                  handleChange("customer")({
                    target: {
                      name: "securityQuestions",
                      value: Array.from(e.target.selectedOptions).map((o) => o.value).join(","),
                    },
                  })
                }
                className="rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
              >
                <option>DOB</option>
                <option>SIN</option>
                <option>DL</option>
                <option>CC</option>
                <option>Primary Phone #</option>
                <option>Secondary Phone #</option>
                <option>Email Address</option>
                <option>Billing Address & Postal Code</option>
              </select>
            </label>
          )}

          {showXid && (
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              XID
              <input
                name="xid"
                value={data.customer.xid}
                onChange={handleChange("customer")}
                className="rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
                autoComplete="new-password"
              />
            </label>
          )}

          <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
            ADDRESS
            <input
              name="address"
              value={data.customer.address}
              onChange={handleChange("customer")}
              className="rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
              autoComplete="new-password"
            />
          </label>
        </div>

        <div className="mt-2">
          <MandatePanel />
        </div>
      </FormSection>

      <FormSection title="Issue Details / Inspection / Resolution">
        <p className="text-xs text-gray-500">Sections will be migrated next.</p>
      </FormSection>

      <div className="flex justify-end pt-1">
        <Button
          className="rounded-md bg-green-600 px-5 py-1.5 text-white shadow-sm dark:bg-green-500"
          onClick={openPreview}
        >
          Preview Note
        </Button>
      </div>

      <ModalFull open={showFull} onClose={() => setShowFull(false)} text={noteText} />
      <ModalSplit open={showSplit} onClose={() => setShowSplit(false)} parts={parts} />
    </div>
  );
}