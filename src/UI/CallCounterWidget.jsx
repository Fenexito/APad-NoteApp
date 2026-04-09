// src/ui/CallCounterWidget.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useCallCounter } from "../db/useCallCounter";
import { getNotes } from "../db/notes";
import { Save, Minus, Eraser, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

// ---- UI state persist (posición / minimizado / dock / miniY) ----
const UI_KEY = "callCounter:UI";
function loadUI() {
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // por defecto: minimizado, dock right, centrado vertical
  return { x: null, y: null, minimized: true, dock: "right", miniY: null };
}
function saveUI(s) {
  try { localStorage.setItem(UI_KEY, JSON.stringify(s)); } catch {}
}

// Helpers fecha
function ymdFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function ymd(dOrStr) {
  if (dOrStr instanceof Date) return ymdFromDate(dOrStr);
  if (typeof dOrStr === "string") return dOrStr.slice(0, 10);
  return ymdFromDate(new Date());
}
function fmtDate(dateStr) {
  // 'YYYY-MM-DD' → 'Sep 1, 2025'
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const short = dt.toLocaleString("en-US", { month: "short" });
  return `${short} ${d}, ${y}`;
}
function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === "object") {
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
    if (typeof v._seconds === "number") return new Date(v._seconds * 1000);
  }
  return null;
}

const ZERO_MANUAL = { callback: 0, quick: 0, transfer: 0, others: 0 };

export default function CallCounterWidget() {
  const { today, inc, dec, ensureToday } = useCallCounter();
  const { counts } = today;

  // ====== EDITOR DE FECHA ======
  const [editOpen, setEditOpen] = useState(false);
  const [editDateKey, setEditDateKey] = useState(ymd(new Date()));
  const [editManual, setEditManual] = useState({ ...ZERO_MANUAL });
  const [editBaseline, setEditBaseline] = useState({ ...ZERO_MANUAL });
  const [editInbound, setEditInbound] = useState(0);

  async function loadEditorForDate(dk) {
    // manuales desde store (hoy o historial)
    const st = useCallCounter.getState();
    let base = ZERO_MANUAL;
    if (dk === st.today.date) {
      base = {
        callback: st.today.counts.callback || 0,
        quick: st.today.counts.quick || 0,
        transfer: st.today.counts.transfer || 0,
        others: st.today.counts.others || 0,
      };
    } else {
      const hc = st.history[dk]?.counts || {};
      base = {
        callback: hc.callback || 0,
        quick: hc.quick || 0,
        transfer: hc.transfer || 0,
        others: hc.others || 0,
      };
    }
    setEditManual(base);
    setEditBaseline(base);

    // inbound (TS) desde notas reales del día seleccionado
    const all = await getNotes();
    let c = 0;
    for (const n of all || []) {
      const d = toDate(n?.createdAt) || toDate(n?.created) || toDate(n?.timestamp) || toDate(n?.ts);
      if (!d) continue;
      if (ymd(d) === dk) c++;
    }
    setEditInbound(c);
  }

  const isDirty = useMemo(() => {
    return JSON.stringify(editManual) !== JSON.stringify(editBaseline);
  }, [editManual, editBaseline]);

  // 🔄 SINCRONIZAR Inbound (TS) = cantidad de notas del día HOY (para la vista principal)
  useEffect(() => {
    let alive = true;
    async function syncInboundToday() {
      try {
        const all = await getNotes();
        const todayKey = ymd(new Date());
        let c = 0;
        for (const n of all || []) {
          const d = toDate(n?.createdAt) || toDate(n?.created) || toDate(n?.timestamp) || toDate(n?.ts);
          if (!d) continue;
          if (ymd(d) === todayKey) c++;
        }
        if (!alive) return;
        useCallCounter.getState().setTroubleshoot(c);
      } catch (e) {
        console.warn("[CallCounter] syncInboundToday error:", e);
      }
    }
    syncInboundToday();
    const handler = () => syncInboundToday();
    window.addEventListener("notes:changed", handler);
    return () => { alive = false; window.removeEventListener("notes:changed", handler); };
  }, []);

  // rollover de fecha (cada minuto)
  useEffect(() => {
    ensureToday();
    const id = setInterval(ensureToday, 60_000);
    return () => clearInterval(id);
  }, [ensureToday]);

  // ===== UI local (posición/minimizado) =====
  const [ui, setUi] = useState(loadUI);
  useEffect(() => { saveUI(ui); }, [ui]);

  // panel tamaño (más ancho para nombres largos)
  const PANEL_W = 320;

  // centrado al abrir
  function centerPos() {
    const x = Math.max(8, (window.innerWidth - PANEL_W) / 2);
    const y = Math.max(8, (window.innerHeight - 230) / 2);
    return { x, y };
  }
  const [pos, setPos] = useState(() => {
    const p = loadUI();
    if (p.x == null || p.y == null) return centerPos();
    return { x: p.x, y: p.y };
  });

  // drag del panel abierto
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const startDrag = (e) => {
    if (ui.minimized) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };
  const onMouseMove = (e) => {
    if (dragging.current && !ui.minimized) {
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    }
    if (dragMini.current && ui.minimized) {
      const y = Math.max(36, Math.min(window.innerHeight - 36, e.clientY));
      setUi((o) => ({ ...o, miniY: y }));
    }
  };
  const endDrag = () => {
    if (dragging.current) {
      dragging.current = false;
      setUi((o) => ({ ...o, x: pos.x, y: pos.y }));
    }
    if (dragMini.current) {
      dragMini.current = false;
    }
  };
  useEffect(() => {
    const mm = (e) => onMouseMove(e);
    const mu = () => endDrag();
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    return () => {
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mouseup", mu);
    };
  }, [ui.minimized, pos]);

  // minimizar / expandir
  const minimizeToSide = () => {
    const mid = window.innerWidth / 2;
    const dock = pos.x + PANEL_W / 2 < mid ? "left" : "right";
    setUi((o) => ({
      ...o,
      minimized: true,
      dock,
      miniY: o.miniY ?? Math.round(window.innerHeight / 2),
    }));
  };
  const expandCentered = () => {
    const c = centerPos();
    setPos(c);
    setUi((o) => ({ ...o, minimized: false, x: c.x, y: c.y }));
  };

  // bounds
  const clampedStyle = {
    left: Math.max(8, Math.min(pos.x, window.innerWidth - PANEL_W - 8)),
    top: Math.max(8, Math.min(pos.y, window.innerHeight - 220)),
    width: PANEL_W,
  };

  // total del panel (hoy)
  const total =
    (counts.troubleshoot || 0) +
    (counts.callback || 0) + // Outbound (TS)
    (counts.quick || 0) +
    (counts.transfer || 0) +
    (counts.others || 0);

  // botón minimizado flotante
  const dragMini = useRef(false);
  const onMiniMouseDown = (e) => { dragMini.current = true; e.preventDefault(); };
  const miniSide = ui.dock === "left" ? { left: 8 } : { right: 8 };
  const miniTop = { top: (ui.miniY ?? Math.round(window.innerHeight / 2)) + "px", transform: "translateY(-50%)" };

  // ===== Acciones de editor =====
  function onCalendarToggle() {
    if (!editOpen) {
      // abrir
      const dk = ymd(today.date);
      setEditDateKey(dk);
      setEditOpen(true);
      loadEditorForDate(dk);
    } else {
      // cerrar solo si NO hay cambios
      if (!isDirty) setEditOpen(false);
      // si hay cambios, no se cierra (sin alertas)
    }
  }
  async function changeEditDate(dk) {
    setEditDateKey(dk);
    await loadEditorForDate(dk);
  }
  function adjustEdit(type, delta) {
    setEditManual((m) => ({ ...m, [type]: Math.max(0, (m[type] || 0) + delta) }));
  }
  function saveEdit() {
    const st = useCallCounter.getState();
    let current = ZERO_MANUAL;
    if (editDateKey === st.today.date) {
      current = {
        callback: st.today.counts.callback || 0,
        quick: st.today.counts.quick || 0,
        transfer: st.today.counts.transfer || 0,
        others: st.today.counts.others || 0,
      };
    } else {
      const hc = st.history[editDateKey]?.counts || {};
      current = {
        callback: hc.callback || 0,
        quick: hc.quick || 0,
        transfer: hc.transfer || 0,
        others: hc.others || 0,
      };
    }
    const deltas = {
      callback: (editManual.callback || 0) - (current.callback || 0),
      quick: (editManual.quick || 0) - (current.quick || 0),
      transfer: (editManual.transfer || 0) - (current.transfer || 0),
      others: (editManual.others || 0) - (current.others || 0),
    };
    useCallCounter.getState().addManualMany(editDateKey, deltas);
    // actualizar baseline y CERRAR el editor para confirmar guardado
    setEditBaseline(editManual);
    setEditOpen(false);
  }

  // Helpers flechas fecha en editor
  function shiftEditDate(days) {
    const [y, m, d] = editDateKey.split("-").map(Number);
    const base = new Date(y, m - 1, d);
    base.setDate(base.getDate() + days);
    const nextKey = ymd(base);
    changeEditDate(nextKey);
  }

  // ===== RENDER minimizado =====
  if (ui.minimized) {
    return (
      <button
        onMouseDown={onMiniMouseDown}
        onClick={expandCentered}
        className="fixed z-[9999] cursor-pointer rounded-full bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
        style={{ ...miniSide, ...miniTop }}
        title="Abrir contador"
      >
        {total}
      </button>
    );
  }

  return (
    <div
      className="fixed z-[9999] select-none rounded-xl bg-white/95 shadow-lg ring-1 ring-black/5 dark:bg-gray-900/95"
      style={clampedStyle}
      onMouseDown={(e) => { if (e.target.closest?.("[data-drag]")) startDrag(e); }}
    >
      {/* Barra superior */}
      <div
        data-drag
        className="flex items-center justify-between rounded-t-xl bg-gray-50 px-2 py-1.5 dark:bg-gray-800"
      >
        <div className="flex items-center gap-2 text-[12px]">
          <span className="opacity-70">{fmtDate(today.date)}</span>
          <span className="font-semibold">· {total}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Calendario → abre/cierra editor (si no hay cambios sin guardar) */}
          <button
            onClick={onCalendarToggle}
            disabled={editOpen && isDirty}
            className={`rounded-md p-1 ${editOpen && isDirty ? "cursor-not-allowed opacity-50" : "hover:bg-gray-200/70 dark:hover:bg-gray-700"}`}
            title={editOpen && isDirty ? "Guardá cambios para cerrar el editor" : "Editar día (calendario)"}
          >
            <CalendarIcon size={14} />
          </button>

          {/* Limpiar (solo manuales) — sin confirmación */}
          <button
            onClick={() => { useCallCounter.getState().clearManualToday(); }}
            className="rounded-md p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700"
            title="Limpiar contadores manuales"
          >
            <Eraser size={14} />
          </button>

          {/* Guardar día (acumula manuales en historial) */}
          <button
            onClick={() => useCallCounter.getState().closeDay()}
            className="rounded-md p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700"
            title="Archivar día (solo manuales)"
          >
            <Save size={14} />
          </button>

          {/* Minimizar */}
          <button
            onClick={minimizeToSide}
            className="rounded-md p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700"
            title="Minimizar"
          >
            <Minus size={14} />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-2 py-2 text-[13px]">
        {/* ===== Editor embebido (toggle) ===== */}
        {editOpen && (
          <div className="mb-2 rounded-lg border-2 border-blue-300 p-2 ring-1 ring-blue-200 dark:border-blue-500/60 dark:ring-blue-500/30">
            {/* Fecha con flechas */}
            <div className="mb-2 flex items-center gap-2">
              <button
                onClick={() => shiftEditDate(-1)}
                disabled={isDirty}
                className={`rounded-md border px-2 py-1 ${isDirty ? "cursor-not-allowed opacity-50" : "hover:bg-gray-100 dark:hover:bg-gray-700"} dark:border-gray-700`}
                title={isDirty ? "Guardá cambios para cambiar de fecha" : "Día anterior"}
              >
                <ChevronLeft size={14} />
              </button>
              <input
                type="date"
                value={editDateKey}
                onChange={(e) => changeEditDate(e.target.value)}
                disabled={isDirty}
                className={`h-8 flex-1 rounded-md border px-2 text-[12px] ${isDirty ? "cursor-not-allowed opacity-60" : "bg-white dark:bg-gray-800"} border-gray-300 dark:border-gray-700`}
              />
              <button
                onClick={() => shiftEditDate(1)}
                disabled={isDirty}
                className={`rounded-md border px-2 py-1 ${isDirty ? "cursor-not-allowed opacity-50" : "hover:bg-gray-100 dark:hover:bg-gray-700"} dark:border-gray-700`}
                title={isDirty ? "Guardá cambios para cambiar de fecha" : "Día siguiente"}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Inbound (TS) — alineado y debajo del selector */}
            <RowCounterReadOnly label="Inbound Call (TS)" value={editInbound} />

            {/* Filas de edición (manuales) */}
            <EditorRow
              label="Outbound Call (TS)"
              value={editManual.callback}
              onInc={() => adjustEdit("callback", +1)}
              onDec={() => adjustEdit("callback", -1)}
              color="purple"
            />
            <EditorRow
              label="Quick Call / Information (No TS)"
              value={editManual.quick}
              onInc={() => adjustEdit("quick", +1)}
              onDec={() => adjustEdit("quick", -1)}
              color="green"
            />
            <EditorRow
              label="Transfer Call (No TS)"
              value={editManual.transfer}
              onInc={() => adjustEdit("transfer", +1)}
              onDec={() => adjustEdit("transfer", -1)}
              color="blue"
            />
            <EditorRow
              label="Other Interactions"
              value={editManual.others}
              onInc={() => adjustEdit("others", +1)}
              onDec={() => adjustEdit("others", -1)}
              color="gray"
            />

            {/* Botón guardar centrado */}
            <div className="mt-2 flex items-center justify-center">
              <button
                onClick={saveEdit}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        )}

        {/* ===== Vista principal (HOY) ===== */}
        <RowCounterReadOnly label="Inbound Call (TS)" value={counts.troubleshoot} />

        <RowCounter
          label="Outbound Call (TS)"
          value={counts.callback}
          onInc={() => inc("callback")}
          onDec={() => dec("callback")}
          color="purple"
        />
        <RowCounter
          label="Quick Call / Information (No TS)"
          value={counts.quick}
          onInc={() => inc("quick")}
          onDec={() => dec("quick")}
          color="green"
        />
        <RowCounter
          label="Transfer Call (No TS)"
          value={counts.transfer}
          onInc={() => inc("transfer")}
          onDec={() => dec("transfer")}
          color="blue"
        />
        <RowCounter
          label="Other Interactions"
          value={counts.others}
          onInc={() => inc("others")}
          onDec={() => dec("others")}
          color="gray"
        />
      </div>
    </div>
  );
}

/* ---------- Subcomponentes ---------- */

// Fila "readonly" con botones invisibles para alinear como las demás
function RowCounterReadOnly({ label, value }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="truncate">{label}</span>
      <div className="flex items-center gap-1">
        <button disabled className="invisible rounded-md bg-gray-100 px-2 py-0.5 text-[12px] dark:bg-gray-700">–</button>
        <span className="min-w-[22px] text-center font-semibold">{value || 0}</span>
        <button disabled className="invisible rounded-md px-2.5 py-0.5 text-[12px]">+1</button>
      </div>
    </div>
  );
}

function RowCounter({ label, value, onInc, onDec, color = "gray" }) {
  const pill = colorPill(color);
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="truncate">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={onDec}
          className="rounded-md bg-gray-100 px-2 py-0.5 text-[12px] hover:bg-gray-200 dark:bg-gray-700"
          title="Reducir 1"
        >
          –
        </button>
        <span className="min-w-[22px] text-center font-semibold">{value || 0}</span>
        <button
          onClick={onInc}
          className={`rounded-md px-2.5 py-0.5 text-[12px] ${pill}`}
          title="Sumar 1"
        >
          +1
        </button>
      </div>
    </div>
  );
}

// Fila de editor (misma UI pero usa estado local del editor)
function EditorRow({ label, value, onInc, onDec, color = "gray" }) {
  const pill = colorPill(color);
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="truncate">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={onDec} className="rounded-md bg-gray-100 px-2 py-0.5 text-[12px] hover:bg-gray-200 dark:bg-gray-700">–</button>
        <span className="min-w-[22px] text-center font-semibold">{value || 0}</span>
        <button onClick={onInc} className={`rounded-md px-2.5 py-0.5 text-[12px] ${pill}`}>+1</button>
      </div>
    </div>
  );
}

function colorPill(color) {
  switch (color) {
    case "red":    return "bg-red-100 hover:bg-red-200 dark:bg-red-900/40";
    case "blue":   return "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40";
    case "purple": return "bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40";
    case "green":  return "bg-green-100 hover:bg-green-200 dark:bg-green-900/40";
    default:       return "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/40";
  }
}
