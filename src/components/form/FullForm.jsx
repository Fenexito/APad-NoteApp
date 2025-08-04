import { useFormStore } from "../../store/useFormStore";
import { buildNote } from "../../utils/noteBuilder";
import { splitNote } from "../../utils/splitNote";
import { useState, useMemo } from "react";
import Button from "../ui/Button";
import ModalFull from "../ui/ModalFull";
import ModalSplit from "../ui/ModalSplit";
import CollapsibleChecklist from "../ui/CollapsibleChecklist";

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
    <div className="mx-auto w-full max-w-[600px] space-y-8 p-4">
      {/* Customer Info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Customer Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <label
              key={f.key}
              className={`flex flex-col gap-1 text-sm ${f.span === 2 ? "sm:col-span-2" : ""}`}
            >
              {f.label}
              <input
                name={f.key}
                value={data.customer[f.key]}
                onChange={handleChange}
                className="rounded border px-3 py-2 dark:bg-gray-800"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Placeholder for other sections */}
      <section className="rounded border bg-yellow-50 p-4 text-sm dark:bg-yellow-900/20">
        Sections Issue Details, System Inspection, and Resolution will be migrated next.
      </section>

      <CollapsibleChecklist />

      <div className="flex justify-end">
        <Button
          className="bg-green-600 text-white dark:bg-green-500"
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
