// src/components/ui/CollapsibleChecklist.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import useFormStore from "../db/useFormStore";
import { MANDATES, evaluateMandates } from "../form/mandateRules";

/* Colores pastel suaves + texto oscuro */
const COLORS = {
  YES: "bg-green-200 text-gray-900",
  NO: "bg-red-200 text-gray-900",
  NA: "bg-yellow-100 text-gray-900",
  "": "bg-gray-50 text-gray-900",
  undefined: "bg-gray-50 text-gray-900",
};

/* Resalta TODAS las palabras en MAYÚSCULAS */
const highlight = (txt) => {
  const out = [];
  let last = 0;
  String(txt).replace(/([A-Z0-9/]{2,})/g, (m, caps, idx) => {
    if (idx > last) out.push(txt.slice(last, idx));
    out.push(
      <span key={idx} className="font-bold text-blue-700">
        {caps}
      </span>
    );
    last = idx + caps.length;
  });
  out.push(txt.slice(last));
  return out;
};

export default function CollapsibleChecklist({
  section,
  defaultOpen = true,   // <- nuevo: apertura por defecto controlada desde el padre
  resetSignal = 0,      // <- nuevo: incrementa al reabrir la sección para resincronizar
}) {
  // ---------- store ----------
  const data = useFormStore((s) => s.data);
  const checklist = useFormStore((s) => s.data.checklist);
  const setItem = useFormStore((s) => s.setChecklistItem);

  const items = useMemo(() => MANDATES.filter((m) => m.section === section), [section]);

  // ---------- UI local ----------
  const [open, setOpen] = useState(() => !!defaultOpen);

  // Derivados de estado: ¿ya están todos contestados?
  const answeredAll = useMemo(
    () => items.every(({ id }) => ["YES", "NO", "NA"].includes(checklist?.[id])),
    [items, checklist]
  );
  const mandatesMissing = useMemo(() => !answeredAll, [answeredAll]);

  // Guardamos el valor previo para detectar la transición "faltaba" -> "completo"
  const prevAnsweredAll = useRef(answeredAll);
  useEffect(() => {
    // Cuando el usuario completa TODOS (transición false -> true) y está abierto, se cierra
    if (!prevAnsweredAll.current && answeredAll && open) {
      setOpen(false);
    }
    prevAnsweredAll.current = answeredAll;
  }, [answeredAll, open]);

  // Inicializa como vacío si nunca ha sido contestado
  useEffect(() => {
    items.forEach(({ id }) => {
      if (checklist[id] === undefined) setItem(id, "");
    });
  }, [items, checklist, setItem]);

  // Aplica reglas automáticas, pero SOLO pone YES en el checklist
  useEffect(() => {
    const auto = evaluateMandates(data);
    Object.entries(auto).forEach(([idStr, autoVal]) => {
      const id = +idStr;
      if (autoVal === "YES" && checklist[id] !== "YES") {
        setItem(id, "YES");
      }
    });
  }, [data, checklist, setItem]);

  // Re-sincroniza la apertura al re-abrir la sección o cambiar el default
  // Si ya están completos, mantenlo cerrado; si faltan, respeta defaultOpen
  useEffect(() => {
    setOpen(answeredAll ? false : !!defaultOpen);
  }, [resetSignal, defaultOpen, answeredAll]);

  // Handler simple: usuario puede abrir/cerrar cuando quiera
  const handleToggle = () => setOpen((o) => !o);

  // Clases para el fondo del colapsable (verde si completo, rojo si faltan, blanco en progreso)
  const containerBg = answeredAll
    ? "bg-green-700 text-white"
    : mandatesMissing
    ? "bg-red-500 text-white"
    : "bg-white dark:bg-gray-800 text-gray-900";

  return (
    <div className={`rounded-lg shadow transition-colors duration-200 ${containerBg}`}>
      {/* header */}
      <button
        onClick={handleToggle}
        className={`
          flex w-full items-center px-2 py-1 text-left text-[11px] font-semibold uppercase
          transition-colors duration-200
          ${answeredAll ? "text-white" : mandatesMissing ? "text-white" : "text-gray-900"}
        `}
      >
        <span className="flex-1">Excellence Mandate</span>
        {!open && answeredAll && <Check size={14} className="mr-1 text-white" />}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* body */}
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-[999px]" : "max-h-0"}`}>
        <ul className="space-y-1 px-2 pb-2 pt-1">
          {items.map(({ id, text }) => {
            const val = checklist[id] ?? "";
            return (
              <li key={id}>
                <div className={`flex items-center justify-between rounded-md px-2 py-1 text-[11px] ${COLORS[val]}`}>
                  <p className="flex-1">{highlight(text)}</p>
                  {/* botones alineados */}
                  <div className="flex shrink-0">
                    {["YES", "NO", "NA"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setItem(id, opt)}
                        className={`mx-[1px] w-8 rounded border px-1.5 py-0.5 font-bold ${
                          val === opt ? "bg-white text-gray-900 border-gray-400" : "border-transparent"
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
