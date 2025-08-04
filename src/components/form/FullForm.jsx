import { useFormStore } from "../../store/useFormStore";
import { buildNote } from "../../utils/noteBuilder";
import { splitNote } from "../../utils/splitNote";
import { useState, useMemo } from "react";
import Button from "../ui/Button";
import ModalFull from "../ui/ModalFull";
import ModalSplit from "../ui/ModalSplit";
import CollapsibleChecklist from "../ui/CollapsibleChecklist";
import FormSection from "../ui/FormSection";

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    update("customer", { [name]: value });
  };

  return (
    <div className="mx-auto w-full max-w-[600px] space-y-6 px-4 pb-10">
      <FormSection title="Customer Information">
        <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {fields.map((f) => (
            <label
              key={f.key}
              className={`flex flex-col gap-1 text-xs font-medium ${f.span === 2 ? "sm:col-span-2 md:col-span-4" : ""}`}
            >
              {f.label}
              <input
                name={f.key}
                value={data.customer[f.key]}
                onChange={handleChange}
                className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-800"
              />
            </label>
          ))}
        </div>
      </FormSection>

      {/* Placeholder for other sections */}
      <FormSection title="Issue Details / Inspection / Resolution">
        <p className="text-sm text-gray-500">Sections will be migrated next.</p>
      </FormSection>

      <CollapsibleChecklist />

      <div className="flex justify-end">
        <Button
          className="rounded-lg bg-green-600 px-6 py-2 text-white shadow-md dark:bg-green-500"
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
