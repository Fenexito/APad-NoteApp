/* src/components/ui/CollapsibleChecklist.jsx */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { useFormStore } from "../../store/useFormStore";
import { MANDATES, evaluateMandates } from "../../mandate/mandateRules";

/* Colores pastel suaves + texto oscuro */
const COLORS = {
  YES: "bg-green-200 text-gray-900",
  NO:  "bg-red-200 text-gray-900",
  NA:  "bg-yellow-100 text-gray-900",
};

/* Resalta TODAS las palabras en MAYÚSCULAS */
const highlight = (txt) => {
  const out = [];
  let last = 0;
  txt.replace(/([A-Z0-9/]{2,})/g, (m, caps, idx) => {
    if (idx > last) out.push(txt.slice(last, idx));
    out.push(
      <span key={idx} className="font-bold text-blue-700">
        {caps}
      </span>,
    );
    last = idx + caps.length;
  });
  out.push(txt.slice(last));
  return out;
};

export default function CollapsibleChecklist({ section }) {
  /* ---------- store ---------- */
  const data      = useFormStore((s) => s.data);
  const checklist = useFormStore((s) => s.data.checklist);
  const setItem   = useFormStore((s) => s.setChecklistItem);

  const items = MANDATES.filter((m) => m.section === section);

  /* ---------- UI local ---------- */
  const [open, setOpen] = useState(true);     // siempre arranca abierto
  const autoCollapsed = useRef(false);        // evita varios cierres
  const touched       = useRef(new Set());    // IDs tocados manualmente
  const [, force]     = useState(0);          // trigger rerender

  const markTouched = (id) => {
    if (!touched.current.has(id)) {
      touched.current.add(id);
      force((n) => n + 1);
    }
  };

  /* Valor inicial “NO” para cada ítem */
  useEffect(() => {
    items.forEach(({ id }) => {
      if (!checklist[id]) setItem(id, "NO");
    });
  }, [items, checklist, setItem]);

  /* Autochequeo (reglas) – NO marca “touched” */
  useEffect(() => {
  const auto = evaluateMandates(data);        // { id:"YES" | "NO" | "NA" }

  Object.entries(auto).forEach(([idStr, autoVal]) => {
    const id = +idStr;
    if (autoVal === "YES" && checklist[id] !== "YES") {
      setItem(id, "YES");                     // ← ÚNICA escritura automática
    }
  });
}, [data, checklist, setItem]);

  /* Colapsa UNA sola vez cuando el usuario haya “tocado” todos */
  const allTouched = touched.current.size === items.length;
  useEffect(() => {
    if (!autoCollapsed.current && allTouched) {
      setOpen(false);
      autoCollapsed.current = true;
    }
  }, [allTouched]);

  /* ---------- render ---------- */
  return (
    <div className="rounded-lg bg-white shadow dark:bg-gray-800">
      {/* header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center px-2 py-1 text-left text-[11px] font-semibold uppercase"
      >
        <span className="flex-1">Excellence Mandate</span>
        {allTouched && <Check size={14} className="mr-1 text-green-600" />}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* body */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[999px]" : "max-h-0"
        }`}
      >
        <ul className="space-y-1 px-2 pb-2 pt-1">
          {items.map(({ id, text }) => {
            const val = checklist[id] || "NO";
            return (
              <li key={id}>
                <div
                  className={`flex items-center justify-between rounded-md px-2 py-1 text-[11px] ${COLORS[val]}`}
                >
                  <p className="flex-1">{highlight(text)}</p>

                  {/* botones alineados */}
                  <div className="flex shrink-0">
                    {["YES", "NO", "NA"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          /* 1️⃣  registra que el usuario tocó este mandato */
                          markTouched(id);
                          /* 2️⃣  guarda el valor elegido */
                          setItem(id, opt);
                        }}
                        className={`mx-[1px] w-8 rounded border px-1.5 py-0.5 font-bold ${
                          val === opt
                            ? "bg-white text-gray-900 border-gray-400"
                            : "border-transparent"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
