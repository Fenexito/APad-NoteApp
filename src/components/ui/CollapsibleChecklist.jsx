import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import useFormStore from "../../store/useFormStore";
import { MANDATES, evaluateMandates } from "../../mandate/mandateRules";

/* Colores pastel suaves + texto oscuro */
const COLORS = {
  YES: "bg-green-200 text-gray-900",
  NO:  "bg-red-200 text-gray-900",
  NA:  "bg-yellow-100 text-gray-900",
  "":  "bg-gray-50 text-gray-900",
  undefined: "bg-gray-50 text-gray-900"
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
      </span>
    );
    last = idx + caps.length;
  });
  out.push(txt.slice(last));
  return out;
};

export default function CollapsibleChecklist({ section }) {
  // ---------- store ----------
  const data      = useFormStore((s) => s.data);
  const checklist = useFormStore((s) => s.data.checklist);
  const setItem   = useFormStore((s) => s.setChecklistItem);

  const items = MANDATES.filter((m) => m.section === section);

  // ---------- UI local ----------
  const [open, setOpen] = useState(true); // SIEMPRE inicia abierto
  const touched = useRef(new Set());      // IDs tocados manualmente
  const [, force] = useState(0);          // trigger rerender

  // Marca ítem como tocado si fue clic manual
  const markTouched = (id) => {
    if (!touched.current.has(id)) {
      touched.current.add(id);
      force((n) => n + 1);
    }
  };

  // Inicializa como vacío si nunca ha sido contestado
  useEffect(() => {
    items.forEach(({ id }) => {
      if (checklist[id] === undefined) setItem(id, "");
    });
  }, [items, checklist, setItem]);

  // Aplica reglas automáticas, pero SOLO pone YES en el checklist (no afecta touched)
  useEffect(() => {
    const auto = evaluateMandates(data);
    Object.entries(auto).forEach(([idStr, autoVal]) => {
      const id = +idStr;
      if (autoVal === "YES" && checklist[id] !== "YES") {
        setItem(id, "YES");
      }
    });
  }, [data, checklist, setItem]);

  // COMPLETADO = el usuario hizo click manual en todos los mandates (aunque los autos estén en YES, solo cuenta si fue tocado)
  const allTouched = touched.current.size === items.length;
  useEffect(() => {
    if (allTouched && open) {
      setOpen(false);
    }
    // eslint-disable-next-line
  }, [allTouched]);

  // Handler simple: usuario puede abrir/cerrar cuando quiera
  const handleToggle = () => setOpen((o) => !o);

  // ¿Falta alguno sin contestar?
  const mandatesMissing = items.some(({ id }) =>
    !["YES", "NO", "NA"].includes(checklist[id])
  );

  // Clases para el fondo y texto del colapsable completo (verde o rojo, texto blanco)
  const containerBg = allTouched
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
          ${allTouched ? "text-white" : mandatesMissing ? "text-white" : "text-gray-900"}
        `}
      >
        <span className="flex-1">Excellence Mandate</span>
        {!open && allTouched && (
          <Check size={14} className="mr-1 text-white" />
        )}
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
            const val = checklist[id] ?? "";
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
                          markTouched(id);
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
