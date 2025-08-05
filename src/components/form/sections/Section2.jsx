import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { useFormStore } from "../../../store/useFormStore";
import FormSection from "../../ui/FormSection";

/* ------------------------------------------------------------
 * Look‑up arrays
 * ----------------------------------------------------------*/
const SERVICE_STATES = [
  { value: "Active",      text: "text-green-600",  bg: "bg-green-600" },
  { value: "Pending",     text: "text-yellow-600", bg: "bg-yellow-600" },
  { value: "Activating",  text: "text-blue-600",   bg: "bg-blue-600" },
  { value: "Suspended",   text: "text-amber-700",  bg: "bg-amber-700" },
  { value: "Cancelled",   text: "text-red-600",    bg: "bg-red-600" },
  { value: "No Services", text: "text-gray-500",   bg: "bg-gray-500" },
];

const SERVICE_OPTIONS = [
  "HighSpeed",
  "Optik TV Legacy",
  "Optik TV Evo",
  "HomePhone",
  "Telus Email",
  "MyTelus",
  "Telus Online Security",
  "Telus Connect App",
  "SHS Legacy",
  "Living Well Companion",
  "Others",
];

const WORKFLOW_OPTIONS = ["Option A", "Option B"];

export default function Section2() {
  /* ----------------------------------------------------------
   * Zustand store bindings
   * --------------------------------------------------------*/
  const issue  = useFormStore((s) => s.data.issue);
  const update = useFormStore((s) => s.updateSection);

  /* ----------------------------------------------------------
   * UI state
   * --------------------------------------------------------*/
  const [open, setOpen]       = useState(true);
  const [colored, setColored] = useState(false); // bg color for ServiceOnCsr select when closed

  const clearIssue = () =>
    update("issue", {
      cxIssue: "",
      serviceOnCsr: "",
      errorType: "",
      errorDetails: "",
      technology: "",
      service: "",
      workflow: "",
    });

  /* ----------------------------------------------------------
   * Validation flags (basic)
   * --------------------------------------------------------*/
  const requiredMissing = useMemo(() => ({
    cxIssue: !issue.cxIssue,
    serviceOnCsr: !issue.serviceOnCsr,
  }), [issue]);

  /* ----------------------------------------------------------
   * Handlers
   * --------------------------------------------------------*/
  const handleChange = (e) => {
    const { name, value } = e.target;
    update("issue", { [name]: value });
  };

  const setField = (field, value) => update("issue", { [field]: value });

  // When service changes, reset workflow
  const handleServiceChange = (e) => {
    const value = e.target.value;
    update("issue", { service: value, workflow: "" });
  };

  // Auto‑grow textarea
  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  /* ----------------------------------------------------------
   * Derived UI helpers
   * --------------------------------------------------------*/
  const selectedBg   = SERVICE_STATES.find((s) => s.value === issue.serviceOnCsr)?.bg || "";
  const selectClass  = `form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${colored && issue.serviceOnCsr ? `${selectedBg} text-white` : ""} ${requiredMissing.serviceOnCsr ? "border-red-500" : "border-gray-300"}`;

  const showDetails  = issue.errorType === "outage" || issue.errorType === "ncError";
  const row1Cols     = showDetails ? "grid-cols-3" : "grid-cols-2";

  /* ----------------------------------------------------------
   * JSX
   * --------------------------------------------------------*/
  return (
    <FormSection>
      {/* --------------- Collapsible header ----------------*/}
      <div className="mb-1 flex cursor-pointer items-center justify-between" onClick={() => setOpen(!open)}>
        <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Issue Details / Inspection / Resolution
        </h3>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={clearIssue} className="text-red-500 hover:text-red-700" aria-label="Clear section">
            <Trash2 size={14} />
          </button>
          <button type="button" className="text-blue-600 dark:text-blue-400">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* ---------------- CX ISSUE ----------------*/}
          <div className="mb-2 flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
            <label htmlFor="cxIssue" className="inline-flex items-center gap-0.5">
              CX ISSUE{requiredMissing.cxIssue && <span className="text-red-600">*</span>}
            </label>
            <textarea
              id="cxIssue"
              name="cxIssue"
              value={issue.cxIssue}
              onChange={handleChange}
              onInput={autoResize}
              autoComplete="off"
              rows={2}
              className="form-input resize-none overflow-hidden rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
            />
          </div>

          {/* ---------------- Row 1: ServiceOnCSR / Error / Info -------------*/}
          <div className={`grid ${row1Cols} gap-2`}>
            {/* SERVICE ON CSR */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <label htmlFor="serviceOnCsr" className="inline-flex items-center gap-0.5">
                SERVICE ON CSR{requiredMissing.serviceOnCsr && <span className="text-red-600">*</span>}
              </label>
              <select
                id="serviceOnCsr"
                name="serviceOnCsr"
                value={issue.serviceOnCsr}
                onChange={handleChange}
                onFocus={() => setColored(false)}
                onBlur={() => setColored(true)}
                className={selectClass}
                autoComplete="off"
              >
                <option value="">—</option>
                {SERVICE_STATES.map(({ value, text }) => (
                  <option key={value} value={value} className={text}>{value}</option>
                ))}
              </select>
            </div>

            {/* ERROR TOGGLE */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span className="inline-flex items-center gap-0.5">ERROR (Outage / NetCracker)</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: "Outage", val: "outage", color: "bg-red-600" },
                  { label: "None",   val: "",        color: "bg-gray-400" },
                  { label: "NC Error", val: "ncError", color: "bg-blue-600" },
                ].map(({ label, val, color }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setField("errorType", val)}
                    className={`w-full rounded px-1 py-0.5 text-[11px] ${issue.errorType === val ? `${color} text-white` : "border border-gray-300 dark:bg-gray-800"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* OUTAGE / NC INFO */}
            {showDetails && (
              <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
                <label htmlFor="errorDetails" className="inline-flex items-center gap-0.5">
                  {issue.errorType === "outage" ? "OUTAGE INFO" : "NETCRACKER INFO"}
                </label>
                <textarea
                  id="errorDetails"
                  name="errorDetails"
                  value={issue.errorDetails}
                  onChange={handleChange}
                  onInput={autoResize}
                  autoComplete="off"
                  rows={1}
                  className="form-input resize-none overflow-hidden rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
                />
              </div>
            )}
          </div>

          {/* ---------------- Row 2: Technology / Service / Workflow ---------*/}
          <div className="mt-2 grid grid-cols-3 gap-2">
            {/* TECHNOLOGY toggle */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>TECHNOLOGY</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: "Copper", val: "copper", color: "bg-amber-700" },
                  { label: "None",   val: "",       color: "bg-gray-400" },
                  { label: "Fiber",  val: "fiber",  color: "bg-blue-600" },
                ].map(({ label, val, color }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setField("technology", val)}
                    className={`w-full rounded px-1 py-0.5 text-[11px] ${issue.technology === val ? `${color} text-white` : "border border-gray-300 dark:bg-gray-800"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* SERVICE select */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <label htmlFor="service">SERVICE</label>
              <select
                id="service"
                name="service"
                value={issue.service}
                onChange={handleServiceChange}
                className="form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
              >
                <option value="">—</option>
                {SERVICE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* WORKFLOW select */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <label htmlFor="workflow">WORKFLOW</label>
              <select
                id="workflow"
                name="workflow"
                value={issue.workflow}
                onChange={handleChange}
                className="form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800"
                disabled={issue.service === ""}
              >
                <option value="">—</option>
                {WORKFLOW_OPTIONS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </FormSection>
  );
}
