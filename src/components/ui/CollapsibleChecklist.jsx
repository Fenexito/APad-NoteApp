import { useState, useRef, useEffect } from "react";
import { useFormStore } from "../../store/useFormStore";
import { ChevronDown, ChevronUp } from "lucide-react";

const ITEMS = [
  "Greeted customer",
  "Verified account security",
  "Explained troubleshooting steps",
  "Confirmed resolution or next action",
  "Offered further assistance",
];

export default function CollapsibleChecklist() {
  const [open, setOpen] = useState(false);
  const checklist = useFormStore((s) => s.data.checklist);
  const toggle = useFormStore((s) => s.toggleChecklistItem);
  const ref = useRef(null);

  // Auto‑collapse when all done
  useEffect(() => {
    if (open && ITEMS.every((i) => checklist[i])) setOpen(false);
  }, [checklist, open]);

  return (
    <div className="rounded-2xl bg-white shadow dark:bg-gray-800">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
        onClick={() => setOpen(!open)}
      >
        <span>Excellence Mandate</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      <div
        ref={ref}
        style={{ maxHeight: open ? ref.current?.scrollHeight : 0 }}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      >
        <ul className="space-y-2 px-4 pb-4 text-sm">
          {ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!checklist[item]}
                onChange={() => toggle(item)}
              />
              <span className={checklist[item] ? "line-through opacity-60" : ""}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}