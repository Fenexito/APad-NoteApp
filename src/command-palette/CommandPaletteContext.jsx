/* ------------------------------------------------------------------------
   SECTION 4 – Call Outcome & Finalization
   ------------------------------------------------------------------------ */
import { useState } from "react";
import {
  ChevronUp, ChevronDown, Trash2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useFormStore } from "../../../store/useFormStore";
import FormSection from "../../ui/FormSection";
import CollapsibleChecklist from "../../ui/CollapsibleChecklist";

/* ───────── Listas ───────── */
const RESOLVED_OPTS = [
  "YES | EOC",
  "No | Call Disconnected | Left VM",
  "No | Tech Booked",
  "No | Follow Up Required",
  "No | Follow Up Required | Set SCB with FVA",
  "No | BOSR Created",
  "No | NC Ticket Created",
  "Cx ask for a Manager | Unable to de escalate | Escalate to EMT",
  "No | Cx needs to be transferred",
];

const BG_COLOR = {
  "YES | EOC": "bg-green-600",
  "No | Call Disconnected | Left VM": "bg-amber-500",
  "No | Tech Booked": "bg-amber-500",
  "No | Follow Up Required": "bg-amber-500",
  "No | Follow Up Required | Set SCB with FVA": "bg-amber-500",
  "No | BOSR Created": "bg-blue-600",
  "No | NC Ticket Created": "bg-blue-600",
  "Cx ask for a Manager | Unable to de escalate | Escalate to EMT": "bg-red-600",
  "No | Cx needs to be transferred": "bg-purple-600",
};

const TRANSFER_OPTS = [
  "FFH CARE","FFH LOYALTY","FFH CAM - COLLECTIONS","C2F",
  "MOB TS","MOB CARE","MOB LOYALTY","MOB CAM",
  "wHSIA TS","SATELLITE TS",
  "SMARTHOME CARE","SMARTHOME LOYALTY","SMARTHOME PLUS",
  "CUSTOM HOME CARE","CUSTOM HOME LOYALTY","CUSTOM HOME TS",
];

const TIME_SLOTS = [
  "08:00 – 10:00","10:00 – 12:00","12:00 – 14:00",
  "14:00 – 16:00","16:00 – 18:00","18:00 – 20:00","20:00 – 22:00",
];

/* ───────── Componente ───────── */
export default function Section4() {
  const res = useFormStore((s) => s.data.resolution);
  const up  = useFormStore((s) => s.updateSection);

  const [open, setOpen]           = useState(true);
  const [transferOnToggle, setT]  = useState(false);

  const set = (k, v) => up("resolution", { [k]: v });

  const clearSection = () =>
    up("resolution", {
      outcome:"", techCbr:"", techDate:"", techTime:"",
      techAoc:"", ticketSpecial:"", transferDept:"",
      ticketFinal:"", csrOrder:"",
    });

  /* flags */
  const isTech      = res.outcome === "No | Tech Booked";
  const isFollowUp  = res.outcome.startsWith("No | Follow Up Required");
  const isTicket    = ["No | BOSR Created","No | NC Ticket Created",
                       "Cx ask for a Manager | Unable to de escalate | Escalate to EMT"]
                       .includes(res.outcome);
  const autoTransfer    = res.outcome === "No | Cx needs to be transferred";
  const transferEnabled = autoTransfer || transferOnToggle;

  const ticketLbl =
    res.outcome === "No | BOSR Created" ? "BOSR TICKET"
    : res.outcome === "No | NC Ticket Created" ? "NC TICKET"
    : res.outcome === "Cx ask for a Manager | Unable to de escalate | Escalate to EMT"
      ? "EMT TICKET"
      : "TICKET ID";

  /* validaciones */
  const missOutcome   = !res.outcome;
  const missTech      = isTech && (!res.techCbr || !res.techDate || !res.techTime);
  const missFUp       = isFollowUp && (!res.techDate || !res.techTime);
  const missTicket    = isTicket && !res.ticketSpecial;
  const missTransfer  = transferEnabled && !res.transferDept;
  const missFinal     = !res.ticketFinal;

  const padTicket = () => {
    const d = res.ticketFinal.replace(/\D/g,"");
    if (!d) return;
    set("ticketFinal", d.padStart(15,"0").slice(-15));
  };

  const handleOutcome = (val) => {
    set("outcome", val);
    set("techCbr",""); set("techDate",""); set("techTime","");
    set("ticketSpecial",""); set("transferDept","");
  };

  /* ───────── JSX ───────── */
  return (
    <FormSection>
      {/* header */}
      <div
        className="mb-1 flex cursor-pointer items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          RESOLUTION
        </h3>
        <div className="flex items-center gap-2" onClick={(e)=>e.stopPropagation()}>
          <button onClick={clearSection} className="text-red-500 hover:text-red-700">
            <Trash2 size={14}/>
          </button>
          <button className="text-blue-600 dark:text-blue-400">
            {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
        </div>
      </div>

      {!open ? null : (
        <>
          {/* ───────── Fila superior ───────── */}
          <div className="grid grid-cols-3 gap-2">
            {/* RESOLVED */}
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>RESOLVED {missOutcome && <span className="text-red-600">*</span>}</span>
              <div
                className={
                  "rounded border " +
                  (missOutcome
                    ? "border-red-500"
                    : res.outcome
                      ? `${BG_COLOR[res.outcome]} border-transparent`
                      : "border-gray-300")
                }
              >
                <select
                  value={res.outcome}
                  onChange={(e)=>handleOutcome(e.target.value)}
                  className={`w-full bg-transparent px-1 py-0.5 text-[11px] focus:outline-none ${
                    res.outcome ? "text-white" : "text-black"
                  }`}
                >
                  <option value="" className="text-black">—</option>
                  {RESOLVED_OPTS.map((o)=>(
                    <option key={o} className="text-black">{o}</option>
                  ))}
                </select>
              </div>
            </label>

            {/* TRANSFER */}
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span className="flex items-center gap-1">
                TRANSFER
                <button type="button" onClick={()=>setT(!transferOnToggle)} className="text-blue-600">
                  {transferEnabled ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                </button>
                {missTransfer && transferEnabled && <span className="text-red-600">*</span>}
              </span>
              <select
                disabled={!transferEnabled}
                value={res.transferDept}
                onChange={(e)=>set("transferDept", e.target.value)}
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  transferEnabled
                    ? missTransfer ? "border-red-500" : "border-gray-300"
                    : "opacity-40 border-gray-300"
                }`}
              >
                <option value="">—</option>
                {TRANSFER_OPTS.map((t)=><option key={t}>{t}</option>)}
              </select>
            </label>

            {/* CSR ORDER */}
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>CSR ORDER</span>
              <input
                value={res.csrOrder}
                onChange={(e)=>set("csrOrder", e.target.value)}
                className="form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 border-gray-300"
              />
            </label>
          </div>

          {/* ───────── Tech / Follow-Up ───────── */}
          {(isTech || isFollowUp) && (
            <div className={`mt-2 grid ${isTech?"grid-cols-4":"grid-cols-2"} gap-2`}>
              {isTech && (
                <label className="flex flex-col text-[10px] font-semibold uppercase">
                  <span>CBR2 {missTech&&!res.techCbr && <span className="text-red-600">*</span>}</span>
                  <input
                    value={res.techCbr}
                    onChange={(e)=>set("techCbr", e.target.value)}
                    className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                      missTech&&!res.techCbr ? "border-red-500":"border-gray-300"
                    }`}
                  />
                </label>
              )}

              <label className="flex flex-col text-[10px] font-semibold uppercase">
                <span>
                  {isTech?"DISPATCH DATE":"FOLLOW UP DATE"}{" "}
                  {(isTech?missTech:missFUp)&&!res.techDate && <span className="text-red-600">*</span>}
                </span>
                <input
                  type="date"
                  value={res.techDate}
                  onChange={(e)=>set("techDate", e.target.value)}
                  className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    (isTech?missTech:missFUp)&&!res.techDate ? "border-red-500":"border-gray-300"
                  }`}
                />
              </label>

              <label className="flex flex-col text-[10px] font-semibold uppercase">
                <span>
                  {isTech?"DISPATCH TIME":"FOLLOW UP TIME"}{" "}
                  {(isTech?missTech:missFUp)&&!res.techTime && <span className="text-red-600">*</span>}
                </span>
                <select
                  value={res.techTime}
                  onChange={(e)=>set("techTime", e.target.value)}
                  className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    (isTech?missTech:missFUp)&&!res.techTime ? "border-red-500":"border-gray-300"
                  }`}
                >
                  <option value="">—</option>
                  {TIME_SLOTS.map((t)=><option key={t}>{t}</option>)}
                </select>
              </label>

              {isTech && (
                <label className="flex flex-col text-[10px] font-semibold uppercase">
                  <span>AOC</span>
                  <input
                    readOnly value="Yes | $200. Cx aware and agree"
                    className="form-input rounded border px-1 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-800 border-gray-300"
                  />
                </label>
              )}
            </div>
          )}

          {/* ───────── Ticket final + extra ───────── */}
          <div className={`mt-2 grid ${isTicket?"grid-cols-2":"grid-cols-1"} gap-2`}>
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>TICKET {missFinal && <span className="text-red-600">*</span>}</span>
              <input
                inputMode="numeric" maxLength={15}
                value={res.ticketFinal}
                onBlur={padTicket}
                onChange={(e)=>
                  set("ticketFinal", e.target.value.replace(/\D/g,"").slice(0,15))
                }
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  missFinal ? "border-red-500":"border-gray-300"
                }`}
              />
            </label>

            {isTicket && (
              <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
                <span>{ticketLbl} {missTicket && <span className="text-red-600">*</span>}</span>
                <input
                  value={res.ticketSpecial}
                  onChange={(e)=>set("ticketSpecial", e.target.value)}
                  className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    missTicket ? "border-red-500":"border-gray-300"
                  }`}
                />
              </label>
            )}
          </div>

          {/* Excellence Mandate (Sección 4) */}
          <div className="mt-2">
            <CollapsibleChecklist section={4} />
          </div>
        </>
      )}
    </FormSection>
  );
}
