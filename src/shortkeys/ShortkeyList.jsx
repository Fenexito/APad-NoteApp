// src/shortkeys/ShortkeyList.jsx
import React, { useMemo, useState, useEffect } from "react";
import { ChevronRight, Search, X, Minimize, StretchVertical } from "lucide-react";

/* ========= Density toggle ========= */
function useDensity() {
  const [density, setDensity] = useState(() => localStorage.getItem("shortkeys_density") || "comfortable");
  useEffect(() => {
    localStorage.setItem("shortkeys_density", density);
  }, [density]);
  return [density, setDensity];
}
function DensityToggle({ density, onChange }) {
  const baseBtn =
    "inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold transition";
  return (
    <div className="inline-flex items-center rounded-full border border-blue-100/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur shadow-sm overflow-hidden">
      <button
        onClick={() => onChange("comfortable")}
        className={`${baseBtn} ${
          density === "comfortable"
            ? "bg-blue-600 text-white"
            : "text-blue-700 dark:text-blue-300 hover:bg-blue-50/60 dark:hover:bg-slate-700/60"
        }`}
        title="Comfortable"
        aria-label="Comfortable density"
      >
        <StretchVertical size={16} />
      </button>
      <button
        onClick={() => onChange("compact")}
        className={`${baseBtn} border-l border-blue-100/60 dark:border-slate-700 ${
          density === "compact"
            ? "bg-blue-600 text-white"
            : "text-blue-700 dark:text-blue-300 hover:bg-blue-50/60 dark:hover:bg-slate-700/60"
        }`}
        title="Compact"
        aria-label="Compact density"
      >
        <Minimize size={16} />
      </button>
    </div>
  );
}

/* ========= Chevron reutilizable ========= */
const Chevron = ({ className = "", rotate = 0 }) => (
  <ChevronRight
    size={18}
    className={`text-slate-600 dark:text-slate-300 transition-transform ${className}`}
    style={{ transform: `rotate(${rotate}deg)` }}
  />
);

/* ========= Colores de etiquetas (igual que en el editor) ========= */
const TAG_STYLES = {
  "GENERAL": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  "CX ISSUE": "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800/40",
  "TS STEPS": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800/40",
  "AWA STEPS": "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-800/40",
  "OTHER": "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-800/40",
};
const Tag = ({ t }) => {
  const key = String(t || "").toUpperCase();
  const cls = TAG_STYLES[key] || TAG_STYLES["GENERAL"];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-[1px] text-[10px] font-semibold ${cls}`}
      title={key}
    >
      {key}
    </span>
  );
};

/* ========= Pills de opciones (para COMPACTo) ========= */
const OptionPill = ({ label, nextStep }) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10px] font-medium
               bg-slate-50 text-slate-700 border border-slate-200
               dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-700"
    title={nextStep ? `→ ${nextStep}` : undefined}
  >
    <span className="truncate max-w-[140px]">{label || "—"}</span>
    {nextStep && <span className="opacity-60">→ {nextStep}</span>}
  </span>
);

/** Variable con sus opciones (solo en Compact) */
function VariableWithOptions({ step }) {
  const id = step?.id || "var";
  const options = Array.isArray(step?.options) ? step.options : [];

  return (
    <div className="rounded-lg border border-blue-100/60 dark:border-slate-700 bg-blue-50/40 dark:bg-slate-900/40 px-2 py-1.5">
      {/* Encabezado de variable */}
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11px] font-semibold
                     bg-blue-50 text-blue-700 border border-blue-200
                     dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800/40"
        >
          {id}
        </span>
        <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80 font-semibold">
          {options.length} opts
        </span>
      </div>
      {/* Opciones */}
      {options.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {options.map((opt, i) => (
            <OptionPill
              key={`${id}|${i}`}
              label={opt?.label || opt?.value || "—"}
              nextStep={opt?.nextStep && opt.nextStep !== "result" ? opt.nextStep : ""}
            />
          ))}
        </div>
      ) : (
        <div className="mt-1.5 text-[11px] italic text-slate-400 dark:text-slate-500">
          (sin opciones)
        </div>
      )}
    </div>
  );
}

/* ========= Tarjeta ========= */
function ShortkeyCard({
  item,
  selected,
  dense,
  onSelect,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) {
  const rowTextSize = dense ? "text-[12px]" : "text-[13px]";
  const tplText = (item?.steps || []).find((s) => s.type === "template")?.template || "";
  const selects = (item?.steps || []).filter((s) => s.type === "select");

  return (
    <li
      id={`sk-${item.key}`}
      tabIndex={0}
      aria-selected={selected}
      className={`
        relative rounded-lg p-2 border bg-white/80 dark:bg-slate-900/60 shadow-sm cursor-pointer transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 dark:focus-visible:ring-blue-300/60
        ${selected
          ? "pl-3 border-2 border-blue-500 dark:border-blue-400 bg-blue-50/70 dark:bg-blue-900/30 shadow-md \
             before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 \
             before:bg-blue-500 dark:before:bg-sky-400 before:rounded-r-md"
          : "border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900"}
      `}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(); }}
    >
      <div className={`flex items-center justify-between ${rowTextSize} text-slate-800 dark:text-slate-200`}>
        {/* Info principal */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* KEY (más grande) */}
            <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-[2px]">
              <b className="mr-1 text-[14px] sm:text-[15px] text-blue-700 dark:text-blue-300">@</b>
              <span className="truncate max-w-[200px] text-[14px] sm:text-[15px] font-bold text-blue-800 dark:text-blue-100">
                {item.key || "—"}
              </span>
            </span>

            {/* Etiquetas (pequeñas, con color) */}
            {(item.tags || []).length > 0 && (
              <>
                <span className="text-slate-500 dark:text-slate-400">•</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {(item.tags || []).map((t) => <Tag key={t} t={t} />)}
                </div>
              </>
            )}

            {/* Separador y snippet */}
            <span className="text-slate-500 dark:text-slate-400">•</span>
            <span className="truncate max-w-[420px] text-slate-700 dark:text-slate-300">
              {tplText ? tplText : "—"}
            </span>
          </div>
        </div>

        {/* Controles mover ↑ ↓ */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            className={`p-1 rounded-md hover:bg-blue-100/50 dark:hover:bg-slate-700/50 ${isFirst ? "opacity-40 pointer-events-none" : ""}`}
            title="Move up"
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            aria-label="Move up"
          >
            <Chevron rotate={270} />
          </button>
          <button
            className={`p-1 rounded-md hover:bg-blue-100/50 dark:hover:bg-slate-700/50 ${isLast ? "opacity-40 pointer-events-none" : ""}`}
            title="Move down"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            aria-label="Move down"
          >
            <Chevron rotate={90} />
          </button>
        </div>
      </div>

      {/* Compact: variables + opciones */}
      {dense && selects.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {selects.map((s) => (
            <VariableWithOptions key={s.id || Math.random()} step={s} />
          ))}
        </div>
      )}
    </li>
  );
}

/* ========= Lista principal ========= */
export default function ShortkeyList({
  items,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
  onExport,
  onImport,
  selectedKey,
  onSelect,
  onSelectKey, // compat
}) {
  const setSelect = onSelect || onSelectKey;
  const [query, setQuery] = useState("");

  const [density, setDensity] = useDensity();
  const dense = density === "compact";

  // filtro: key + plantilla + tags
  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => {
      const key = (it.key || "").toLowerCase();
      const tpl = ((it.steps || []).find((st) => st.type === "template")?.template || "").toLowerCase();
      const tags = (it.tags || []).join(" ").toLowerCase();
      return key.includes(s) || tpl.includes(s) || tags.includes(s);
    });
  }, [items, query]);

  // navegación por teclado (+ ESC para deseleccionar)
  const handleListKeyDown = (e) => {
    if (e.key === "Escape") {
      setSelect?.(null);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    if (!filtered.length) return;
    const idx = Math.max(0, filtered.findIndex((it) => it.key === selectedKey));
    if (e.key === "ArrowDown") {
      const next = filtered[idx + 1] ?? filtered[0];
      setSelect?.(next.key);
    } else if (e.key === "ArrowUp") {
      const prev = filtered[idx - 1] ?? filtered[filtered.length - 1];
      setSelect?.(prev.key);
    } else if (e.key === "Home") {
      setSelect?.(filtered[0].key);
    } else if (e.key === "End") {
      setSelect?.(filtered[filtered.length - 1].key);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[580px] px-3 pt-1 pb-10" onClick={() => setSelect?.(null)}>
      {/* Barra superior STICKY */}
      <div
        className="
          sticky top-14 md:top-16 z-20
          mb-5 flex items-center gap-3
          bg-white/70 dark:bg-slate-900/70 backdrop-blur
          border-b border-blue-100/60 dark:border-slate-700
          px-2 py-2 rounded-xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div
          className="
            relative flex flex-1 items-center
            rounded-full border border-blue-100/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur
            shadow-sm focus-within:ring-2 focus-within:ring-blue-300
          "
        >
          <span className="pl-3">
            <Search size={18} className="text-blue-500/80" />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            type="text"
            placeholder="Search shortkeys by @key, text or tag"
            className="
              w-full bg-transparent outline-none px-3 py-2 text-[14px]
              placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100
            "
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 p-1 rounded-full hover:bg-blue-100/60 dark:hover:bg-slate-700/60"
              aria-label="Clear search"
              title="Clear"
            >
              <X size={16} className="text-blue-700/80 dark:text-blue-300/80" />
            </button>
          )}
        </div>

        {/* Density */}
        <DensityToggle density={density} onChange={setDensity} />

        {/* Acciones rápidas */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            className="inline-flex items-center rounded-xl bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
            onClick={onAdd}
            title="Add new shortkey"
          >
            + New
          </button>
          <button
            className="inline-flex items-center rounded-xl border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={onExport}
            title="Export JSON"
          >
            Export
          </button>
          <button
            className="inline-flex items-center rounded-xl border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={onImport}
            title="Import JSON"
          >
            Import
          </button>
        </div>
      </div>

      {/* Lista */}
      <div
        className="space-y-2"
        role="listbox"
        aria-activedescendant={selectedKey ? `sk-${selectedKey}` : undefined}
        tabIndex={0}
        onKeyDown={handleListKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500">
            No shortkeys found.
          </div>
        )}

        <ul className="space-y-2">
          {filtered.map((it, idx) => {
            const selected = selectedKey === it.key;
            const isFirst = idx === 0;
            const isLast = idx === filtered.length - 1;

            return (
              <ShortkeyCard
                key={it.key || idx}
                item={it}
                selected={selected}
                dense={dense}
                onSelect={() => setSelect?.(it.key)}
                onMoveUp={() => onMove?.(it.key, "up")}
                onMoveDown={() => onMove?.(it.key, "down")}
                isFirst={isFirst}
                isLast={isLast}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
}
