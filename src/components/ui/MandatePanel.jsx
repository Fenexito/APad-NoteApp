import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import SwitchRow from "./SwitchRow";
import { useFormStore } from "../../store/useFormStore";

const ITEMS = [
  "Greeted customer",
  "Verified account security",
];

export default function MandatePanel() {
  const checklist = useFormStore((s) => s.data.checklist);
  const toggle = useFormStore((s) => s.toggleChecklistItem);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const allDone = ITEMS.every((i) => checklist[i]);

  useEffect(() => {
    if (allDone) setOpen(false);
  }, [allDone]);

  return (
    <div className="rounded-md bg-white shadow dark:bg-gray-900">
      <button
        className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase"
        onClick={() => setOpen(!open)}
      >
        Excellence Mandate {allDone && "✔"}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <div
        ref={ref}
        style={{ maxHeight: open ? ref.current?.scrollHeight : 0 }}
        className="overflow-hidden transition-[max-height] duration-300"
      >
        <div className="space-y-1 px-2 pb-2">
          {ITEMS.map((item) => (
            <SwitchRow key={item} label={item} value={!!checklist[item]} onChange={() => toggle(item)} />
          ))}
        </div>
      </div>
    </div>
  );
}