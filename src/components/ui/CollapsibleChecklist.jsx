
import { useState } from "react";
import { useFormStore } from "../../store/useFormStore";
import Button from "./Button";

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

  const allDone = ITEMS.every((i) => checklist[i]);

  return (
    <div className="rounded border p-4">
      <button
        className="flex w-full items-center justify-between font-semibold"
        onClick={() => setOpen(!open)}
      >
        Excellence Mandate {allDone && "✅"}
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-2 text-sm">
          {ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!checklist[item]}
                onChange={() => toggle(item)}
              />
              <span className={checklist[item] ? "line-through" : ""}>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}