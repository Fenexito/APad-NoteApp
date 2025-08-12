import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, X, Minimize, StretchVertical } from "lucide-react";
import { groupNotesByMonthDay, formatMonth, formatDay } from "../../utils/date";
import { parseMetaFromText } from "../../utils/history";

const GT_TZ = "America/Guatemala";

/* ========================= Helpers ========================= */
function pick(obj, path, fallback = undefined) {
  try {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) cur = cur?.[p];
    return cur ?? fallback;
  } catch {
    return fallback;
  }
}
function parseDate(dstr) {
  const d = new Date(dstr || Date.now());
  return isNaN(d.getTime()) ? new Date() : d;
}
function getCreated(n) {
  return n.createdAt || n.created || n.timestamp;
}

function getService(n) {
  const top = n.service ?? "";
  const nested = pick(n, "issue.service", "");
  if (top || nested) return top || nested;
  const meta = parseMetaFromText(n.text || "");
  return meta.service || "";
}
function getWorkflow(n) {
  const top = n.workflow ?? "";
  const nested = pick(n, "issue.workflow", "");
  if (top || nested) return top || nested;
  const meta = parseMetaFromText(n.text || "");
  return meta.workflow || "";
}
function getResolutionText(n) {
  return pick(n, "resolution.summary") ?? n.resolution?.outcome ?? n.outcome ?? "";
}

/** Decide agenda a mostrar (DISPATCH / FOLLOW UP) */
function pickScheduleToShow(note) {
  const outcome = (note.resolution?.outcome || note.outcome || "").toLowerCase();

  let techD = note.resolution?.techDate || "";
  let techT = note.resolution?.techTime || "";
  let fuD = note.resolution?.followUpDate || "";
  let fuT = note.resolution?.followUpTime || "";

  if (!techD && !techT && !fuD && !fuT) {
    const meta = parseMetaFromText(note.text || "");
    techD = meta.techDate || "";
    techT = meta.techTime || "";
    fuD = meta.followUpDate || "";
    fuT = meta.followUpTime || "";
  }

  if (outcome.includes("follow up")) {
    if (fuD || fuT) return { label: "FOLLOW UP", d: fuD, t: fuT };
    return { label: "", d: "", t: "" };
  }
  if (outcome.includes("tech")) {
    if (techD || techT) return { label: "DISPATCH", d: techD, t: techT };
    return { label: "", d: "", t: "" };
  }

  if (fuD || fuT) return { label: "FOLLOW UP", d: fuD, t: fuT };
  if (techD || techT) return { label: "DISPATCH", d: techD, t: techT };
  return { label: "", d: "", t: "" };
}

/** Etiqueta/valor correctos para special ticket */
function getSpecialTicket(note) {
  const txt = (note.text || "").toUpperCase();
  const meta = parseMetaFromText(note.text || "");

  const bosr = note.bosrTicket || meta.bosrTicket || (txt.includes("BOSR TICKET") ? (note.resolution?.ticketSpecial || meta.specialTicket) : "");
  if (bosr) return { label: "BOSR TICKET", value: bosr };

  const nc = note.ncTicket || meta.ncTicket || (txt.includes("NC TICKET") ? (note.resolution?.ticketSpecial || meta.specialTicket) : "");
  if (nc) return { label: "NC TICKET", value: nc };

  const emt = note.emtTicket || meta.emtTicket || (txt.includes("EMT TICKET") ? (note.resolution?.ticketSpecial || meta.specialTicket) : "");
  if (emt) return { label: "EMT TICKET", value: emt };

  const fallback = note.resolution?.ticketSpecial || meta.specialTicket || "";
  if (fallback) return { label: "TICKET", value: fallback };

  return { label: "", value: "" };
}

/** Tonos por outcome (badge/contorno base) */
function outcomeTone(n) {
  const out = (n.resolution?.outcome || n.outcome || "").toLowerCase();
  const isNo = out.startsWith("no");
  const hasBOSR = !!n.bosrTicket || out.includes("bosr");
  const hasNC = !!n.ncTicket || out.includes("nc ticket");
  const isFollowUp = out.includes("follow up");
  const isTech = out.includes("tech booked") || out.includes("tech");

  if (isNo && (hasBOSR || hasNC)) return { badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200", ring: "ring-1 ring-blue-200 dark:ring-blue-700/50" };
  if (isFollowUp) return { badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200", ring: "ring-1 ring-rose-200 dark:ring-rose-700/50" };
  if (isTech) return { badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200", ring: "ring-1 ring-violet-200 dark:ring-violet-700/50" };
  if (out.startsWith("yes")) return { badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200", ring: "ring-1 ring-emerald-200 dark:ring-emerald-700/50" };
  return { badge: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200", ring: "ring-1 ring-slate-200 dark:ring-slate-700/50" };
}

/** Chevron */
const Chevron = ({ open }) => (
  <ChevronRight
    size={18}
    className={`transition-transform ${open ? "rotate-90" : "rotate-0"} text-slate-600 dark:text-slate-300`}
  />
);

/** Density toggle con íconos (persistente) */
function useDensity() {
  const [density, setDensity] = useState(() => localStorage.getItem("history_density") || "comfortable");
  useEffect(() => {
    localStorage.setItem("history_density", density);
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
        className={`${baseBtn} ${density === "comfortable"
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
        className={`${baseBtn} border-l border-blue-100/60 dark:border-slate-700 ${density === "compact"
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

/* ========================= Tarjeta de Nota ========================= */
function NoteCard({ n, selected, dense, onOpenView, setSelectedNote }) {
  const service = getService(n) || "--";
  const workflow = getWorkflow(n) || "--";
  const resolution = getResolutionText(n) || "--";
  const schedule = pickScheduleToShow(n);
  const { label: ticketLabel, value: ticketValue } = getSpecialTicket(n);
  const tone = outcomeTone(n);

  const rowTextSize = dense ? "text-[12px]" : "text-[13px]";
  const chipTextSize = dense ? "text-[11px]" : "text-[12px]";

  return (
    <li
      data-note-card
      tabIndex={0}
      aria-selected={selected}
      className={`
        rounded-lg p-2 border bg-white/80 dark:bg-slate-900/60 shadow-sm cursor-pointer transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 dark:focus-visible:ring-blue-300/60
        ${tone.ring}
        ${
          selected
            ? "relative pl-3 border-2 border-blue-500 dark:border-blue-400 bg-blue-50/70 dark:bg-blue-900/30 shadow-md \
               before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 \
               before:bg-blue-500 dark:before:bg-sky-400 before:rounded-r-md"
            : "hover:bg-white dark:hover:bg-slate-900"
        }
      `}
      onClick={() => setSelectedNote(n)}
      onDoubleClick={() => {
        setSelectedNote(n);
        onOpenView && onOpenView();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setSelectedNote(n);
          onOpenView && onOpenView();
        }
      }}
    >
      {/* Fila 1: Identificación + Resolution badge */}
      <div className={`flex items-center justify-between ${rowTextSize} text-slate-800 dark:text-slate-200`}>
        {/* Lado izquierdo: BAN/CID/NAME/CBR */}
        <div className={`flex-1 min-w-0 flex items-center gap-x-3 gap-y-1 flex-wrap ${dense ? "leading-tight" : ""}`}>
          <span><b className="mr-1">BAN:</b>{n.ban || "--"}</span>
          <span><b className="mr-1">CID:</b>{n.cid || "--"}</span>
          <span className="max-w-[160px] truncate"><b className="mr-1">NAME:</b>{n.name || "--"}</span>
          <span><b className="mr-1">CBR:</b>{n.cbr || "--"}</span>
        </div>

        {/* Badge de RESOLUTION visible y consistente */}
        <span
          className={`
            ml-2 inline-flex items-center rounded-full px-2 ${dense ? "py-[1px]" : "py-0.5"} font-semibold ${tone.badge}
            border border-transparent shrink-0 overflow-hidden max-w-[45%]
          `}
          title="Outcome / Resolution"
        >
          <span className={`truncate ${dense ? "text-[11px]" : "text-[12px]"}`}>{resolution}</span>
        </span>
      </div>

      {/* Comfortable = solo 1 fila; Compact = muestra pills */}
      {dense && (
        <>
          {/* Fila 2: SERVICE + WORKFLOW */}
          <div className={`mt-1 flex items-center gap-2 flex-wrap ${chipTextSize} text-slate-700 dark:text-slate-300`}>
            <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-[2px]">
              <b className="mr-1">SERVICE:</b>
              <span className="truncate max-w-[220px]">{service}</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-[2px]">
              <b className="mr-1">WORKFLOW:</b>
              <span className="truncate max-w-[220px]">{workflow}</span>
            </span>
          </div>

          {/* Fila 3: Agenda + Tickets */}
          <div className={`mt-1 flex items-center gap-2 flex-wrap ${chipTextSize} text-slate-700 dark:text-slate-300`}>
            {schedule.label && (schedule.d || schedule.t) && (
              <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-[2px]">
                <b className="mr-1">{schedule.label}:</b>{schedule.d} {schedule.t || ""}
              </span>
            )}
            {ticketValue && (
              <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-[2px]">
                <b className="mr-1">{ticketLabel}:</b>
                <span className="truncate max-w-[240px]">{ticketValue}</span>
              </span>
            )}
            {n.ticket && (
              <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-[2px]">
                <b className="mr-1">TICKET:</b>
                <span className="truncate max-w-[240px]">{n.ticket}</span>
              </span>
            )}
          </div>
        </>
      )}
    </li>
  );
}

/* ========================= Componente principal ========================= */
export default function HistoryList({
  notes,
  selectedNote,
  setSelectedNote,
  onOpenView,
}) {
  // búsqueda
  const [query, setQuery] = useState("");

  // density
  const [density, setDensity] = useDensity();
  const dense = density === "compact"; // compact = muestra todas las pills; comfortable = solo 1 fila

  // colapsables
  const [collapsedMonths, setCollapsedMonths] = useState({});
  const [collapsedDays, setCollapsedDays] = useState({}); // { [monthKey]: { [dayKey]: boolean } }

  /* ========= filtro en tiempo real ========= */
  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const meta = parseMetaFromText(n.text || "");
      const fields = [
        n.ban,
        n.cid,
        n.cbr,
        n.name,
        n.ticket,
        n.bosrTicket,
        n.ncTicket,
        n.emtTicket,
        getService(n) || meta.service,
        getWorkflow(n) || meta.workflow,
        getResolutionText(n) || meta.resolutionText,
        meta.specialTicket,
      ]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());
      return fields.some((f) => f.includes(q));
    });
  }, [notes, query]);

  /* ========= agrupar ========= */
  const groupedFiltered = useMemo(
    () => groupNotesByMonthDay(filteredNotes),
    [filteredNotes]
  );

  /* ========= claves de hoy / mes actual (zona GT) ========= */
  const now = new Date();
  const y = now.toLocaleString("en-CA", { timeZone: GT_TZ, year: "numeric" });
  const m = now.toLocaleString("en-CA", { timeZone: GT_TZ, month: "2-digit" });
  const d = now.toLocaleString("en-CA", { timeZone: GT_TZ, day: "2-digit" });
  const todayDayKey = `${y}-${m}-${d}`;
  const currentMonthKey = `${y}-${m}`;

  /* ========= estado colapsable por defecto (sin búsqueda) ========= */
  useEffect(() => {
    if (query.trim()) return; // si hay búsqueda, no aplicar defaults
    const newCollapsedMonths = {};
    const newCollapsedDays = {};
    Object.keys(groupedFiltered).forEach((monthKey) => {
      const dayMap = groupedFiltered[monthKey] || {};
      newCollapsedDays[monthKey] = {};

      if (monthKey === currentMonthKey) {
        // mes actual: sin encabezado; días → solo HOY abierto
        Object.keys(dayMap).forEach((dayKey) => {
          newCollapsedDays[monthKey][dayKey] = dayKey !== todayDayKey;
        });
      } else {
        // meses previos → colapsados
        newCollapsedMonths[monthKey] = true;
        Object.keys(dayMap).forEach((dayKey) => {
          newCollapsedDays[monthKey][dayKey] = true;
        });
      }
    });
    setCollapsedMonths(newCollapsedMonths);
    setCollapsedDays(newCollapsedDays);
  }, [groupedFiltered, currentMonthKey, todayDayKey, query]);

  /* ========= si hay búsqueda, expandir todo con resultados ========= */
  useEffect(() => {
    const q = query.trim();
    if (!q) return; // manejar default arriba
    const openMonths = {};
    const openDays = {};
    Object.keys(groupedFiltered).forEach((monthKey) => {
      openMonths[monthKey] = false; // expandido
      openDays[monthKey] = {};
      Object.keys(groupedFiltered[monthKey] || {}).forEach((dayKey) => {
        openDays[monthKey][dayKey] = false; // expandido
      });
    });
    setCollapsedMonths(openMonths);
    setCollapsedDays(openDays);
  }, [groupedFiltered, query]);

  /* ========= orden descendente ========= */
  const allMonths = Object.keys(groupedFiltered).sort((a, b) =>
    b.localeCompare(a)
  );
  const prevMonths = allMonths.filter((k) => k !== currentMonthKey);
  const currentMonthDaysMap = groupedFiltered[currentMonthKey] || {};
  const currentMonthSortedDays = Object.keys(currentMonthDaysMap).sort((a, b) =>
    b.localeCompare(a)
  );

  /* ========= toggles ========= */
  const toggleMonth = (monthKey) =>
    setCollapsedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  const toggleDay = (monthKey, dayKey) =>
    setCollapsedDays((prev) => ({
      ...prev,
      [monthKey]: {
        ...(prev[monthKey] || {}),
        [dayKey]: !prev[monthKey]?.[dayKey],
      },
    }));

  /* ========= deseleccionar con ESC o clic fuera de una nota ========= */
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setSelectedNote && setSelectedNote(null);
      }
    };
    const onOutside = (e) => {
      const el = e.target;
      // Ignorar clicks dentro de una tarjeta, dentro de la HistoryBar o dentro de un modal/dialog
      const onCard = el.closest("[data-note-card]");
      const onBar = el.closest("[data-history-bar]");
      const onModal = el.closest("[data-history-modal]") || el.closest("[role='dialog']");
      if (onCard || onBar || onModal) return;
      setSelectedNote && setSelectedNote(null);
    };
    window.addEventListener("keydown", onEsc);
    // Mantenemos capture:true para priorizar la detección, pero ahora excluimos la barra y modales
    document.addEventListener("pointerdown", onOutside, { capture: true });
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.removeEventListener("pointerdown", onOutside, { capture: true });
    };
  }, [setSelectedNote]);

  /* ========================= UI ========================= */
  return (
    <div className="mx-auto max-w-4xl px-4 pt-2 pb-10">
      {/* Barra superior STICKY */}
      <div
        className="
          sticky top-14 md:top-16 z-20
          mb-5 flex items-center gap-3
          bg-white/70 dark:bg-slate-900/70 backdrop-blur
          border-b border-blue-100/60 dark:border-slate-700
          px-2 py-2 rounded-xl
        "
      >
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
            placeholder="Search by BAN, CID, CBR, NAME, TICKET or BOSR"
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

        <DensityToggle density={density} onChange={setDensity} />
      </div>

      {/* Sin resultados */}
      {Object.keys(groupedFiltered).length === 0 && (
        <div className="text-center text-gray-400 dark:text-gray-500">
          No hay notas que coincidan.
        </div>
      )}

      {/* === Mes actual === */}
      {Object.keys(currentMonthDaysMap).length > 0 && (
        <div className="mb-6 space-y-3">
          {currentMonthSortedDays.map((dayKey) => {
            const notesList = currentMonthDaysMap[dayKey] || [];
            const sortedNotes = [...notesList].sort(
              (a, b) =>
                parseDate(getCreated(b)).getTime() -
                parseDate(getCreated(a)).getTime()
            );
            const isDayCollapsed =
              !!collapsedDays?.[currentMonthKey]?.[dayKey];

            return (
              <div
                key={dayKey}
                className="rounded-xl bg-white/80 dark:bg-slate-900/60 border border-blue-100/50 dark:border-slate-700 shadow overflow-hidden"
              >
                {/* Encabezado de Día */}
                <button
                  onClick={() => toggleDay(currentMonthKey, dayKey)}
                  className={`flex w-full items-center justify-between px-3 ${dense ? "py-1.5" : "py-2"}`}
                >
                  <div className="flex items-center gap-2">
                    <Chevron open={!isDayCollapsed} />
                    <span className={`font-semibold text-blue-700 dark:text-blue-300 ${dense ? "text-sm" : "text-base"}`}>
                      {formatDay(dayKey)}
                    </span>
                  </div>
                </button>

                {/* Contenido del día */}
                {!isDayCollapsed && (
                  <div className="border-t border-blue-100/40 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/30 px-3 py-2">
                    <ul className="space-y-2">
                      {sortedNotes.map((n) => {
                        const selected = selectedNote?.id === n.id;
                        return (
                          <NoteCard
                            key={n.id}
                            n={n}
                            selected={selected}
                            dense={dense}
                            setSelectedNote={setSelectedNote}
                            onOpenView={onOpenView}
                          />
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === Meses anteriores === */}
      {Object.keys(groupedFiltered)
        .sort((a, b) => b.localeCompare(a))
        .filter((k) => k !== currentMonthKey)
        .map((monthKey) => {
          const daysMap = groupedFiltered[monthKey] || {};
          const sortedDays = Object.keys(daysMap).sort((a, b) =>
            b.localeCompare(a)
          );
          const isMonthCollapsed = !!collapsedMonths[monthKey];

          return (
            <div
              key={monthKey}
              className="mb-5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-100/50 dark:border-slate-700 shadow overflow-hidden"
            >
              {/* Encabezado de Mes */}
              <button
                onClick={() => toggleMonth(monthKey)}
                className={`flex w-full items-center justify-between px-3 ${dense ? "py-1.5" : "py-2"}`}
              >
                <div className="flex items-center gap-2">
                  <Chevron open={!isMonthCollapsed} />
                  <span className={`font-bold text-blue-700 dark:text-blue-300 ${dense ? "text-base" : "text-lg"}`}>
                    {formatMonth(monthKey)}
                  </span>
                </div>
              </button>

              {/* Días del mes */}
              {!isMonthCollapsed && (
                <div className="border-t border-blue-100/40 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 px-2 py-2">
                  <div className="space-y-3">
                    {sortedDays.map((dayKey) => {
                      const notesList = daysMap[dayKey] || {};
                      const dayNotes = Array.isArray(notesList) ? notesList : [];
                      const sortedNotes = [...dayNotes].sort(
                        (a, b) =>
                          parseDate(getCreated(b)).getTime() -
                          parseDate(getCreated(a)).getTime()
                      );
                      const isDayCollapsed =
                        !!collapsedDays?.[monthKey]?.[dayKey];

                      return (
                        <div
                          key={dayKey}
                          className="rounded-xl bg-white/80 dark:bg-slate-900/60 border border-blue-100/50 dark:border-slate-700 shadow overflow-hidden"
                        >
                          {/* Encabezado de Día */}
                          <button
                            onClick={() => toggleDay(monthKey, dayKey)}
                            className={`flex w-full items-center justify-between px-3 ${dense ? "py-1.5" : "py-2"}`}
                          >
                            <div className="flex items-center gap-2">
                              <Chevron open={!isDayCollapsed} />
                              <span className={`font-semibold text-blue-700 dark:text-blue-300 ${dense ? "text-sm" : "text-base"}`}>
                                {formatDay(dayKey)}
                              </span>
                            </div>
                          </button>

                          {/* Notas del día */}
                          {!isDayCollapsed && (
                            <div className="border-t border-blue-100/40 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/30 px-3 py-2">
                              <ul className="space-y-2">
                                {sortedNotes.map((n) => {
                                  const selected = selectedNote?.id === n.id;
                                  return (
                                    <NoteCard
                                      key={n.id}
                                      n={n}
                                      selected={selected}
                                      dense={dense}
                                      setSelectedNote={setSelectedNote}
                                      onOpenView={onOpenView}
                                    />
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
