import { useFormStore } from "../../store/useFormStore";
import { buildNote } from "../../utils/noteBuilder";
import { splitNote } from "../../utils/splitNote";
import { useState, useMemo } from "react";
import Button from "../ui/Button";
import ModalFull from "../ui/ModalFull";
import ModalSplit from "../ui/ModalSplit";
import SwitchRow from "../ui/SwitchRow";
import FormSection from "../ui/FormSection";

export default function FullForm() {
  const data = useFormStore((s) => s.data);
  const update = useFormStore((s) => s.updateSection);
  const toggleItem = useFormStore((s) => s.toggleChecklistItem);

  const [showFull, setShowFull] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  const noteText = useMemo(() => buildNote(data), [data]);
  const parts = useMemo(() => splitNote(noteText), [noteText]);

  const openPreview = () => {
    parts.length === 1 ? setShowFull(true) : setShowSplit(true);
  };

  const fields = [
    { label: "BAN", key: "ban" },
    { label: "CID", key: "cid" },
    { label: "CBR", key: "cbr" },
    { label: "Caller", key: "caller" },
    { label: "Verified By", key: "verifiedBy" },
    { label: "Security Questions", key: "securityQuestions" },
    { label: "Address", key: "address", span: 2 },
    { label: "XID", key: "xid" },
    { label: "Full Name", key: "name" },
    { label: "Phone", key: "phone" },
    { label: "Account ID", key: "accountId", span: 2 },
  ];

  const mandates = [
    "Greeted customer",
    "Verified account security",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    update("customer", { [name]: value });
  };

  return (
    <div className="mx-auto w-full max-w-[550px] space-y-4 px-3 pb-8">
      <FormSection title="Customer Information">
        <div className="grid gap-3 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {fields.map((f) => (
            <label
              key={f.key}
              className={`flex flex-col gap-1 text-[11px] font-medium ${f.span === 2 ? "sm:col-span-2 md:col-span-4" : ""}`}
            >
              {f.label}
              <input
                name={f.key}
                value={data.customer[f.key]}
                onChange={handleChange}
                className="rounded-md border px-2 py-1 text-xs dark:bg-gray-800"
                autoComplete="off"
              />
            </label>
          ))}
        </div>

        {/* Mandate switches */}
        <div className="mt-4 space-y-2">
          {mandates.map((m) => (
            <SwitchRow key={m} label={m} value={!!data.checklist[m]} onChange={() => toggleItem(m)} />
          ))}
        </div>
      </FormSection>

      {/* Placeholder for other sections */}
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

      <ModalFull open={showFull} onClose={() => setShowFull(false)} text={noteText} />
      <ModalSplit open={showSplit} onClose={() => setShowSplit(false)} parts={parts} />
    </div>
  );
}