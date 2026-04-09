// src/db/useCallCounter.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MANUAL = ["callback", "quick", "transfer", "others"]; // 👈 Outbound (TS) ahora es 'callback'
const ALL = ["troubleshoot", ...MANUAL];

function dateKeyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function dateKey() {
  return dateKeyFromDate(new Date());
}
function parseDateKey(input) {
  if (!input) throw new Error("Fecha inválida");
  if (typeof input === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const d = new Date(input);
    if (!isNaN(d)) return dateKeyFromDate(d);
    throw new Error("String de fecha inválido");
  }
  if (input instanceof Date && !isNaN(input)) return dateKeyFromDate(input);
  throw new Error("Fecha inválida");
}

function newDay(dk = dateKey()) {
  const counts = {};
  ALL.forEach((t) => (counts[t] = 0));
  return { date: dk, counts };
}

function cloneCounts(c = {}) {
  const out = {}; ALL.forEach((t) => out[t] = c[t] || 0);
  return out;
}

export const useCallCounter = create(
  persist(
    (set, get) => ({
      today: newDay(),
      history: {}, // { "YYYY-MM-DD": { date, counts } }

      // --- Asegura rollover diario: archiva el día anterior si cambió la fecha ---
      ensureToday: () => {
        const key = dateKey();
        const { today, history } = get();
        if (today.date !== key) {
          const prevCounts = cloneCounts(history[today.date]?.counts);
          // acumular manuales (lo que ya había + lo de "today")
          const manualAccum = cloneCounts(prevCounts);
          MANUAL.forEach((t) => { manualAccum[t] = (prevCounts[t] || 0) + (today.counts[t] || 0); });

          // Troubleshoot del historial = valor real del día (notas de ese día)
          const finalCounts = { ...manualAccum, troubleshoot: today.counts.troubleshoot };

          set({
            history: {
              ...history,
              [today.date]: { date: today.date, counts: finalCounts },
            },
            today: newDay(key),
          });
        }
      },

      // --- Botones manuales del widget (no afectan Troubleshoot) ---
      inc: (type) => {
        if (!MANUAL.includes(type)) return;
        get().ensureToday();
        const { today } = get();
        set({
          today: {
            ...today,
            counts: { ...today.counts, [type]: (today.counts[type] || 0) + 1 },
          },
        });
      },
      dec: (type) => {
        if (!MANUAL.includes(type)) return;
        get().ensureToday();
        const { today } = get();
        const current = today.counts[type] || 0;
        set({
          today: {
            ...today,
            counts: { ...today.counts, [type]: Math.max(0, current - 1) },
          },
        });
      },

      // --- Troubleshoot SOLO se actualiza desde el conteo real de notas ---
      setTroubleshoot: (val) => {
        get().ensureToday();
        const { today } = get();
        const num = Math.max(0, Number.isFinite(val) ? Math.trunc(val) : 0);
        set({ today: { ...today, counts: { ...today.counts, troubleshoot: num } } });
      },

      // --- Guardar día manual: acumula manuales en historial y resetea manuales (TS intacto) ---
      closeDay: () => {
        const { today, history } = get();
        const prevCounts = cloneCounts(history[today.date]?.counts);
        const updated = cloneCounts(prevCounts);

        MANUAL.forEach((t) => {
          updated[t] = (prevCounts[t] || 0) + (today.counts[t] || 0);
        });

        // NO tocar troubleshoot aquí; se fija en rollover con el valor real del día
        if (typeof updated.troubleshoot !== "number") updated.troubleshoot = prevCounts.troubleshoot || 0;

        set({
          history: {
            ...history,
            [today.date]: { date: today.date, counts: updated },
          },
          today: {
            ...today,
            counts: { ...today.counts, callback: 0, quick: 0, transfer: 0, others: 0 },
          },
        });
      },

      // --- Limpiar manuales del día (sin tocar historial ni troubleshoot) ---
      clearManualToday: () => {
        get().ensureToday();
        const { today } = get();
        set({
          today: {
            ...today,
            counts: { ...today.counts, callback: 0, quick: 0, transfer: 0, others: 0 },
          },
        });
      },

      // === NUEVO: Agregar a días pasados ===

      // Suma 'amount' a un tipo MANUAL en una fecha dada (YYYY-MM-DD o Date).
      addManualToDate: (dateOrKey, type, amount = 1) => {
        if (!MANUAL.includes(type)) return;
        const dk = parseDateKey(dateOrKey);
        const amt = Math.trunc(Number(amount) || 0);
        if (!Number.isFinite(amt) || amt === 0) return;

        const state = get();
        // Si es hoy, edita today; si no, escribe en history.
        if (dk === state.today.date) {
          const curr = state.today.counts[type] || 0;
          const next = Math.max(0, curr + amt);
          set({ today: { ...state.today, counts: { ...state.today.counts, [type]: next } } });
          return;
        }

        const prevCounts = cloneCounts(state.history[dk]?.counts);
        const next = Math.max(0, (prevCounts[type] || 0) + amt);
        const merged = { ...prevCounts, [type]: next, troubleshoot: prevCounts.troubleshoot || 0 };
        set({
          history: {
            ...state.history,
            [dk]: { date: dk, counts: merged },
          },
        });
      },

      // Suma varios tipos de una sola vez en una fecha dada.
      addManualMany: (dateOrKey, deltas = {}) => {
        const dk = parseDateKey(dateOrKey);
        const state = get();

        if (dk === state.today.date) {
          const next = cloneCounts(state.today.counts);
          MANUAL.forEach((t) => {
            const amt = Math.trunc(Number(deltas[t] || 0));
            if (!amt) return;
            next[t] = Math.max(0, (next[t] || 0) + amt);
          });
          set({ today: { ...state.today, counts: next } });
          return;
        }

        const prevCounts = cloneCounts(state.history[dk]?.counts);
        MANUAL.forEach((t) => {
          const amt = Math.trunc(Number(deltas[t] || 0));
          if (!amt) return;
          prevCounts[t] = Math.max(0, (prevCounts[t] || 0) + amt);
        });
        if (typeof prevCounts.troubleshoot !== "number") prevCounts.troubleshoot = 0;

        set({
          history: {
            ...state.history,
            [dk]: { date: dk, counts: prevCounts },
          },
        });
      },
    }),
    { name: "callCounter:v2" }
  )
);
