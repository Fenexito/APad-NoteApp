/* ------------------------------------------------------------------------
   SECTION 4 – Call Outcome & Finalization
   ------------------------------------------------------------------------ */
import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import useFormStore from "../../db/useFormStore";
import FormSection from "../../ui/FormSection";
import CollapsibleChecklist from "../../ui/CollapsibleChecklist";

/* ───────── Listas ───────── */
const RESOLVED_OPTS = [
  "YES | EOC",
  "No | BO Support Required | Tech Booked",
  "No | Call Disconnected | Left VM",
  "No | Tech Booked",
  "No | Follow Up Required",
  "No | Follow Up Required | Set SCB with Scheduler",
  "No | BOSR Created",
  "No | NC Ticket Created",
  "Cx ask for a Manager | Unable to de escalate | Escalate to EMT",
  "No | Cx needs to be transferred",
];

const BG_COLOR = {
  "YES | EOC": "bg-green-600 dark:bg-green-600",
  "No | Call Disconnected | Left VM": "bg-amber-500 dark:bg-amber-500",
  "No | Tech Booked": "bg-amber-500 dark:bg-amber-500",
  "No | BO Support Required | Tech Booked": "bg-amber-500 dark:bg-amber-500",
  "No | Follow Up Required": "bg-amber-500 dark:bg-amber-500",
  "No | Follow Up Required | Set SCB with Scheduler": "bg-amber-500 dark:bg-amber-500",
  "No | BOSR Created": "bg-blue-600 dark:bg-blue-600",
  "No | NC Ticket Created": "bg-blue-600 dark:bg-blue-600",
  "Cx ask for a Manager | Unable to de escalate | Escalate to EMT": "bg-red-600 dark:bg-red-600",
  "No | Cx needs to be transferred": "bg-purple-600 dark:bg-purple-600",
};

const TRANSFER_OPTS = [
  "FFH CARE",
  "FFH LOYALTY",
  "FFH CAM - COLLECTIONS",
  "C2F",
  "MOB TS",
  "MOB CARE",
  "MOB LOYALTY",
  "MOB CAM",
  "wHSIA TS",
  "SATELLITE TS",
  "SMARTHOME CARE",
  "SMARTHOME LOYALTY",
  "SMARTHOME PLUS",
  "CUSTOM HOME CARE",
  "CUSTOM HOME LOYALTY",
  "CUSTOM HOME TS",
];

const TIME_SLOTS = ["08:00-9:00", "9:00-11:00", "11:00-1:00", "1:00-3:00", "3:00-5:00", "5:00-7:00", "8:00-5:00"];

// Slots por hora para FOLLOW UP: 8am → 11pm
  const FOLLOWUP_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const start = 8 + i;          // 8, 9, ..., 22
  const end = start + 1;        // 9, 10, ..., 23
  return `${start}:00-${end}:00`;
});

/* ───────── Componente ───────── */
export default function Section4({
  open,
  onToggle,
  // Indicador de estado (se pinta en el header)
  statusComplete,
  statusIndicatorTitle,
  statusIndicatorClasses,
  // Borde friendly cuando la sección está cerrada
  closedBorderClass,
  // Control del Mandate (Excellence)
  mandateCompleted = false,
  mandateDefaultOpen = true,
  mandateResetSignal = 0,
}) {
  const res = useFormStore((s) => s.data.resolution);
  const up = useFormStore((s) => s.updateSection);
  const resetCount = useFormStore((s) => s.resetCount);

  // PERFIL DE VALIDACIÓN (STRICT|EXPRESS)
  const validationProfile = useFormStore((s) => s.data?.ui?.validationProfile || "strict");
  const isExpress = validationProfile === "express";

  const [transferOnToggle, setT] = useState(false);

  const set = (k, v) => up("resolution", { [k]: v });

  // Solo dígitos
  const cleanInt = (v) => (v ?? "").replace(/\D/g, "");

  const handleOutcome = (val) => {
    set("outcome", val);
    set("techCbr", "");
    set("techDate", "");
    set("techTime", "");
    set("ticketSpecial", "");
    set("transferDept", "");
    if (val === "No | Tech Booked" || val === "No | BO Support Required | Tech Booked") {
      set("techAopc", "Yes | $200. Cx aware and agree");
    } else {
      set("techAopc", "");
    }
  };

  /* flags */
  const isTech = ["No | Tech Booked", "No | BO Support Required | Tech Booked"].includes(res.outcome);
  const isFollowUp = (res.outcome || "").startsWith("No | Follow Up Required");
  // Solo BOSR/NC requieren "ticket especial"; EMT ya no lo usa
  const isTicket = [
    "No | BOSR Created",
    "No | NC Ticket Created",
  ].includes(res.outcome);
  const autoTransfer = res.outcome === "No | Cx needs to be transferred";
  const transferEnabled = autoTransfer || transferOnToggle;

  const ticketLbl =
    res.outcome === "No | BOSR Created"
      ? "BOSR TICKET"
      : res.outcome === "No | NC Ticket Created"
      ? "NC TICKET"
      : "TICKET ID";

  /* validaciones (relajadas en EXPRESS) */
  const missOutcome = !res.outcome;
  const missTech = isExpress ? false : (isTech && (!res.techCbr || !res.techDate || !res.techTime));
  const missFUp = isExpress ? false : (isFollowUp && (!res.techDate || !res.techTime));
  const missTicket = isExpress ? false : (isTicket && !res.ticketSpecial);
  const missTransfer = transferEnabled && !res.transferDept;
  const missFinal = isExpress ? false : !res.ticketFinal;

  const padTicket = () => {
    const d = (res.ticketFinal || "").replace(/\D/g, "");
    if (!d) return;
    set("ticketFinal", d.padStart(15, "0").slice(-15));
  };

  // Auto-fill ticket con "0" en EXPRESS (pero el input sigue visible)
  useEffect(() => {
    if (isExpress) {
      const raw = (res.ticketFinal || "").toString();
      if (!raw.length) set("ticketFinal", "0");
    }
  }, [isExpress, res.ticketFinal]); // eslint-disable-line

  // Auto-colapso cuando los requeridos están OK
  const requiredMissing = useMemo(
    () => ({
      outcome: missOutcome,
      tech: isTech && (!res.techCbr || !res.techDate || !res.techTime),
      followup: isFollowUp && (!res.techDate || !res.techTime),
      ticket: isTicket && !res.ticketSpecial,
      transfer: transferEnabled && !res.transferDept,
      final: missFinal,
    }),
    [missOutcome, isTech, isFollowUp, isTicket, transferEnabled, res.techCbr, res.techDate, res.techTime, res.ticketSpecial, res.transferDept, missFinal]
  );
  const allRequiredComplete = useMemo(
    () => Object.values(requiredMissing).every((v) => !v),
    [requiredMissing]
  );
  const collapseTimerRef = useRef(null);
  const [autoClosing, setAutoClosing] = useState(false);
  const [autoCollapseDisabled, setAutoCollapseDisabled] = useState(false);
  const animTimerRef = useRef(null);
  const prevCompleteRef = useRef(allRequiredComplete);

  // Re-habilitar auto-colapso cuando pase de incompleta→completa tras edición
  useEffect(() => {
    const wasComplete = prevCompleteRef.current;
    if (!wasComplete && allRequiredComplete) {
      setAutoCollapseDisabled(false);
    }
    prevCompleteRef.current = allRequiredComplete;
  }, [allRequiredComplete]);

  useEffect(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (open && allRequiredComplete && !autoCollapseDisabled) {
      collapseTimerRef.current = setTimeout(() => {
        setAutoClosing(true);
        animTimerRef = { current: setTimeout(() => {
          if (open) onToggle();
          setAutoClosing(false);
        }, 300) };
      }, 1000);
    } else {
      setAutoClosing(false);
    }
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
      if (animTimerRef.current) {
        clearTimeout(animTimerRef.current);
        animTimerRef.current = null;
      }
    };
  }, [open, allRequiredComplete, onToggle]);

  /* ───────── JSX ───────── */
  return (
    <FormSection className={!open ? closedBorderClass : ""}>
      {/* header */}
      <div
        className="mb-1 flex cursor-pointer items-center justify-between"
        onClick={() => {
          if (!open) setAutoCollapseDisabled(true);
          if (collapseTimerRef.current) { clearTimeout(collapseTimerRef.current); collapseTimerRef.current = null; }
          if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
          setAutoClosing(false);
          onToggle();
        }}
      >
        <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">RESOLUTION</h3>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span
            className={statusIndicatorClasses}
            title={statusComplete ? "Section complete" : "Section incomplete"}
            aria-label={statusComplete ? "Section complete" : "Section incomplete"}
          >
            {statusIndicatorTitle}
          </span>

          <button
            onClick={() =>
              up("resolution", {
                outcome: "",
                techCbr: "",
                techDate: "",
                techTime: "",
                techAopc: "",
                ticketSpecial: "",
                transferDept: "",
                ticketFinal: "",
                csrOrder: "",
              })
            }
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 size={14} />
          </button>
          <button className="text-blue-600 dark:text-blue-400">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
        </div>
      </div>

      {!open ? null : (
        <div
          /* Evita colapsar mientras hay foco dentro de la sección;
             colapsa al salir si ya está completa */
          onFocusCapture={() => setAutoCollapseDisabled(true)}
          onBlurCapture={(e) => {
            const leftSection = !e.currentTarget.contains(e.relatedTarget);
            if (leftSection) {
              setAutoCollapseDisabled(false);
              if (allRequiredComplete) {
                setAutoClosing(true);
                setTimeout(() => { if (open) onToggle(); setAutoClosing(false); }, 300);
              }
            }
          }}
          className={autoClosing
          ? "transform-gpu origin-top scale-y-0 opacity-0 transition-all duration-300 ease-out overflow-hidden"
          : "transform-gpu origin-top scale-y-100 opacity-100 transition-all duration-300 ease-out"}
        >
          {/* ───────── Fila superior ───────── */}
          <div className="grid grid-cols-3 gap-2">
            {/* RESOLVED */}
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                RESOLVED {missOutcome && <span className="text-red-600">*</span>}
              </span>
              <div
                className={
                  "rounded border " +
                  (missOutcome
                    ? "border-red-500 dark:!border-red-500"
                    : res.outcome
                      ? `${BG_COLOR[res.outcome] || "bg-gray-500 dark:bg-gray-500"} text-white border-transparent`
                      : "border-gray-300 dark:border-gray-600")
                }
              >
                <select
                  value={res.outcome}
                  onChange={(e) => handleOutcome(e.target.value)}
                  className={`w-full bg-transparent dark:!bg-transparent px-1 py-0.5 text-[11px] focus:outline-none
                    dark:[color-scheme:dark] ${
                    res.outcome ? "text-white dark:text-white" : "text-black dark:text-gray-100"
                  }`}
                >
                  <option value=""
                    className="text-black dark:text-gray-100 dark:bg-gray-800">—</option>
                  {RESOLVED_OPTS.map((o) => (
                    <option key={o}
                      className="text-black dark:text-gray-100 dark:bg-gray-800">{o}</option>
                  ))}
                </select>
              </div>
            </label>

            {/* TRANSFER */}
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span className="flex items-center gap-1">
                TRANSFER
                <button type="button" onClick={() => setT(!transferOnToggle)} className="text-blue-600">
                  {transferEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                </button>
                {missTransfer && transferEnabled && <span className="text-red-600">*</span>}
              </span>
              <select
                disabled={!transferEnabled}
                value={res.transferDept}
                onChange={(e) => set("transferDept", e.target.value)}
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  transferEnabled ? (missTransfer ? "border-red-500 dark:!border-red-500" : "border-gray-300") : "opacity-40 border-gray-300"
                }`}
              >
                <option value="">—</option>
                {TRANSFER_OPTS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>

            {/* CSR ORDER */}
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>CSR ORDER</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={res.csrOrder}
                onChange={(e) => set("csrOrder", cleanInt(e.target.value))}
                className="form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 border-gray-300"
              />
            </label>
          </div>

          {/* ───────── Tech / Follow-Up (visibles en EXPRESS; no requeridos) ───────── */}
          {(isTech || isFollowUp) && (
            <div className={`mt-2 grid ${isTech ? "grid-cols-4" : "grid-cols-2"} gap-2`}>
              {isTech && (
                <label className="flex flex-col text-[10px] font-semibold uppercase">
                  <span>
                    CBR2 {(!isExpress && isTech && !res.techCbr) && <span className="text-red-600">*</span>}
                  </span>
                  <input
                    value={res.techCbr}
                    onChange={(e) => set("techCbr", e.target.value)}
                    className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    (!isExpress && isTech && !res.techCbr) ? "border-red-500 dark:!border-red-500" : "border-gray-300"
                    }`}
                  />
                </label>
              )}

              <label className="flex flex-col text-[10px] font-semibold uppercase">
                <span>
                  {isTech ? "DISPATCH DATE" : "FOLLOW UP DATE"}{" "}
                  {(!isExpress && !res.techDate) && <span className="text-red-600">*</span>}
                </span>
                <input
                  type="date"
                  value={res.techDate}
                  onChange={(e) => set("techDate", e.target.value)}
                  className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    (!isExpress && !res.techDate) ? "border-red-500 dark:!border-red-500" : "border-gray-300"
                  }`}
                />
              </label>

              <label className="flex flex-col text-[10px] font-semibold uppercase">
                <span>
                  {isTech ? "DISPATCH TIME" : "FOLLOW UP TIME"}{" "}
                  {(!isExpress && !res.techTime) && <span className="text-red-600">*</span>}
                </span>
                <select
                  value={res.techTime}
                  onChange={(e) => set("techTime", e.target.value)}
                  className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    (!isExpress && !res.techTime) ? "border-red-500 dark:!border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">—</option>
                  {(isTech ? TIME_SLOTS : FOLLOWUP_SLOTS).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>

              {isTech && (
                <label className="flex flex-col text-[10px] font-semibold uppercase">
                  <span>AOPC</span>
                  <input
                    readOnly
                    value={res.techAopc || "Yes | $200. Cx aware and agree"}
                    className="form-input rounded border px-1 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-800 border-gray-300"
                  />
                </label>
              )}
            </div>
          )}

          {/* ───────── Ticket final + extra ───────── */}
          <div className={`mt-2 grid ${isTicket ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
            {/* TICKET FINAL: SIEMPRE visible; en EXPRESS no es requerido */}
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                TICKET {(!isExpress && missFinal) && <span className="text-red-600">*</span>}
              </span>
              <input
                inputMode="numeric"
                maxLength={15}
                value={res.ticketFinal}
                onBlur={padTicket}
                onChange={(e) => set("ticketFinal", e.target.value.replace(/\D/g, "").slice(0, 15))}
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  (!isExpress && missFinal) ? "border-red-500 dark:!border-red-500" : "border-gray-300"
                }`}
              />
            </label>

            {/* Ticket especial: visible si outcome lo requiere; NO requerido en EXPRESS */}
            {isTicket && (
              <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
                <span>
                  {ticketLbl} {(!isExpress && missTicket) && <span className="text-red-600">*</span>}
                </span>
                <input
                  inputMode={["BOSR TICKET", "NC TICKET"].includes(ticketLbl) ? "numeric" : undefined}
                  pattern={["BOSR TICKET", "NC TICKET"].includes(ticketLbl) ? "[0-9]*" : undefined}
                  value={res.ticketSpecial}
                  onChange={(e) =>
                    set(
                      "ticketSpecial",
                      ["BOSR TICKET", "NC TICKET"].includes(ticketLbl) ? (e.target.value || "").replace(/\D/g, "") : e.target.value
                    )
                  }
                  className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    (!isExpress && missTicket) ? "border-red-500 dark:!border-red-500" : "border-gray-300"
                  }`}
                />
              </label>
            )}
          </div>
        </div>
      )}
    </FormSection>
  );
}
