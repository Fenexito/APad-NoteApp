import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function MultiCheckboxPopover({
  options,
  value,
  onChange,
  label,
  missing = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const toggle = (opt) =>
    onChange(
      value.includes(opt)
        ? value.filter((o) => o !== opt)
        : [...value, opt]
    );

  useEffect(() => {
    const close = (e) => open && ref.current && !ref.current.contains(e.target) && setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
          missing ? "border-red-500" : "border-gray-300"
        }`}
      >
        {value.length ? `${value.length} selected` : label}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute z-40 mt-1 max-h-56 w-44 overflow-y-auto rounded border bg-white p-1 text-[11px] shadow dark:bg-gray-800">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-1 py-0.5">
              <input
                type="checkbox"
                checked={value.includes(opt)}
                onChange={() => toggle(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
