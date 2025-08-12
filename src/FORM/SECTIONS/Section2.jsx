/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useMemo, useEffect } from "react";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import useFormStore from "../../../store/useFormStore";
import FormSection from "../../ui/FormSection";
import CollapsibleChecklist from "../../ui/CollapsibleChecklist";
import EquipmentPanel from "../EquipmentPanel";

const SERVICE_STATES = [
  { value: "Active", text: "text-green-600", bg: "bg-green-600" },
  { value: "Pending", text: "text-yellow-600", bg: "bg-yellow-600" },
  { value: "Activating", text: "text-blue-600", bg: "bg-blue-600" },
  { value: "Suspended", text: "text-amber-700", bg: "bg-amber-700" },
  { value: "Cancelled", text: "text-red-600", bg: "bg-red-600" },
  { value: "No Services", text: "text-gray-500", bg: "bg-gray-500" },
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

const WF = {
  copper: {
    HighSpeed: [
      "No Sync",
      "Intermittent Connectivity",
      "No Dataflow",
      "No IP",
      "SlowSpeed",
      "WiFi Disconnects",
      "WiFi Can't Connect",
      "Can't Browse some Websites",
    ],
  },
  fiber: {
    HighSpeed: [
      "ONT Not Ranged",
      "Intermittent Connectivity",
      "No Dataflow",
      "No IP",
      "SlowSpeed",
      "WiFi Disconnects",
      "WiFi Can't Connect",
      "Can't Browse some Websites",
    ],
  },
  HighSpeed: [],
  "Optik TV Legacy": [
    "STB no Boot",
    "STB Setup/Instalation",
    "No Video Issues",
    "Video Quality Issues",
    "Channel Issues",
    "Recording Issue",
    "Audio Issues",
    "Remote Control Issues",
    "Apps Issues",
    "VOD / PPV Issues",
    "Asks for a Reg Code",
    "Telus TV+ App",
  ],
  "Optik TV Evo": [
    "STB no Boot",
    "STB Setup/Instalation",
    "No Video Issues",
    "Video Quality Issues",
    "Channel Issues",
    "Recording Issue",
    "Audio Issues",
    "Remote Control Issues",
    "Apps Issues",
    "VOD / PPV Issues",
    "Login Issues",
    "IPG / Menu Issues",
    "Telus TV+ App",
    "Power Cable Issue",
  ],
  HomePhone: [
    "No Dial Tone",
    "Can't be Called",
    "Can't Call Out",
    "Call Cuts Off",
    "Can't be Heard",
    "Noise on the Line",
    "Long Distance issue",
    "Physical Issues",
    "Nuisance Calls",
    "Other on the Line",
    "Cable / Drop / Terminal issue",
    "Call Display",
    "VoiceMail Issues",
    "Porting Number",
  ],
  "Telus Email": [
    "Login Issues",
    "Password Issues",
    "Account Deleted",
    "Email Creation",
    "Functionality",
    "Third Party app issues",
  ],
  MyTelus: [
    "Login Issues",
    "Verification Code Issue",
    "Password Reset Issues",
    "Account Locked",
    "BackUp Email",
    "Change Email",
    "Create Account",
    "MyTelus APP issues",
  ],
  "Telus Online Security": [
    "Unable to Login",
    "Not Active",
    "Upgrade Subscription",
  ],
  "Telus Connect App": ["Login Issues", "Missing Equipment", "Feature Issue"],
  "Living Well Companion": [
    "Base Not Working",
    "Pendant Not Working",
    "Emergency Contacts",
    "LWC Apple Watch APP",
    "Self Install Inquiries",
    "CMS ACCOUNT NUMBER",
  ],
  Others: [
    "Billing Issues",
    "IPD Suspension",
    "Ghost Call",
    "Where is my Tech?",
    "Same Day Appointment Cancell",
    "Where is my equipment?",
  ],
  "SHS Legacy": [
    "Login / Password Issues",
    "WebPage Portal Portal Issues",
    "APP Issues",
    "General Issues",
    "Main Panel",
    "Secondary Panel",
    "Door / Window Sensor",
    "Motion Sensor",
    "Smoke Detector",
    "CO Detector",
    "Glass Break Detector",
    "Thermostat",
    "InDoor Camera",
    "OutDoor Camera",
    "Doorbell Camera",
    "DoorLock",
    "Garage Door Controller",
    "Smart Automation Devices",
    "CMS inquiry",
    "Wi-Fi Issues",
  ],
};

const getWorkflowOptions = (svc, tech) =>
  !svc ? [] : svc === "HighSpeed" ? WF[tech]?.HighSpeed || [] : WF[svc] || [];

export default function Section2({ open, onToggle }) {
  const issue = useFormStore((s) => s.data.issue);
  const update = useFormStore((s) => s.updateSection);

  const svc = issue.service ?? "";
  const tech = issue.technology ?? "";

  const resetCount = useFormStore((s) => s.resetCount);

  const autoGrow = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const clearIssue = () =>
    update("issue", {
      cxIssue: "",
      serviceOnCsr: "",
      errorType: "none", // <-- no default
      errorDetails: "",
      technology: "",
      service: "",
      workflow: "",
      affected: "",
      equipSummary: "",
      troubleshooting: "",
    });

  // Si el errorType es undefined, NO hay selección por defecto
  useEffect(() => {
    if (issue.errorType === undefined) {
      update("issue", { errorType: undefined });
    }
    // eslint-disable-next-line
  }, []);

  const showDetails =
    issue.errorType === "outage" || issue.errorType === "ncError";
  const rowCols = showDetails ? "grid-cols-3" : "grid-cols-2";

  const requiredMissing = useMemo(
    () => ({
      cxIssue: !issue.cxIssue,
      serviceOnCsr: !issue.serviceOnCsr,
      technology: svc === "HighSpeed" && tech === "",
      service: !svc,
      workflow: !issue.workflow,
      errorDetails: showDetails && !issue.errorDetails,
      affected:
        (svc === "HomePhone" && !issue.affected) ||
        (svc === "Telus Email" && !issue.affected) ||
        (svc === "MyTelus" && !issue.affected),
      troubleshooting: !issue.troubleshooting,
    }),
    [issue, showDetails, tech, svc]
  );

  const selectedBg =
    SERVICE_STATES.find((s) => s.value === issue.serviceOnCsr)?.bg || "";

  const techBorder =
    requiredMissing.technology && svc === "HighSpeed"
      ? "border border-red-500 rounded p-1"
      : "";

  const handle = (e) => update("issue", { [e.target.name]: e.target.value });
  const setField = (k, v) => update("issue", { [k]: v });
  const handleServ = (e) =>
    update("issue", { service: e.target.value, workflow: "", affected: "" });

  const workflowOptions = getWorkflowOptions(svc, tech);

  // --- RENDER ---
  return (
    <FormSection>
      {/* header */}
      <div
        className="mb-1 flex cursor-pointer items-center justify-between"
        onClick={onToggle}
      >
        <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          STATUS, ISSUE & TROUBLESHOOT
        </h3>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={clearIssue}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 size={14} />
          </button>
          <button type="button" className="text-blue-600 dark:text-blue-400">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* CX ISSUE */}
          <div className="form-row">
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase w-full">
              <span className="inline-flex items-center gap-0.5">
                CX ISSUE
                {requiredMissing.cxIssue && (
                  <span className="text-red-600">*</span>
                )}
              </span>
              <textarea
                name="cxIssue"
                value={issue.cxIssue}
                onChange={handle}
                onInput={autoGrow}
                rows={3}
                autoComplete="off"
                className={`shortkey-enabled form-input resize-none rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.cxIssue ? "border-red-500" : "border-gray-300"
                }`}
              />
            </label>
          </div>

          {/* CSR + ERROR */}
          <div className={`form-row mt-2 grid ${rowCols} gap-2`}>
            {/* SERVICE ON CSR */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                SERVICE ON CSR
                {requiredMissing.serviceOnCsr && (
                  <span className="text-red-600"> *</span>
                )}
              </span>
              <div
                className={`rounded border ${
                  issue.serviceOnCsr
                    ? `${selectedBg} border-transparent`
                    : requiredMissing.serviceOnCsr
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              >
                <select
                  name="serviceOnCsr"
                  value={issue.serviceOnCsr}
                  onChange={handle}
                  className={`w-full bg-transparent px-1 py-0.5 text-[11px] focus:outline-none ${
                    issue.serviceOnCsr ? "text-white" : "text-black"
                  }`}
                >
                  <option value="" className="text-black">
                    —
                  </option>
                  {SERVICE_STATES.map((s) => (
                    <option key={s.value} value={s.value} className="text-black">
                      {s.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ERROR toggle */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>ERROR (Outage / NetCracker)</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { v: "outage", lbl: "Outage", cls: "bg-red-600" },
                  { v: "none", lbl: "None", cls: "bg-gray-400" },
                  { v: "ncError", lbl: "NC Error", cls: "bg-blue-600" },
                ].map((b) => (
                  <button
                    key={b.lbl}
                    onClick={() => setField("errorType", b.v)}
                    className={`rounded px-1 py-0.5 text-[11px] ${
                      issue.errorType === b.v
                        ? `${b.cls} text-white`
                        : "border border-gray-300 dark:bg-gray-800"
                    }`}
                  >
                    {b.lbl}
                  </button>
                ))}
              </div>
            </div>

            {showDetails && (
              <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
                <span>
                  {issue.errorType === "outage"
                    ? "OUTAGE INFO"
                    : "NETCRACKER INFO"}
                  {requiredMissing.errorDetails && (
                    <span className="text-red-600"> *</span>
                  )}
                </span>
                <textarea
                  name="errorDetails"
                  value={issue.errorDetails}
                  onChange={handle}
                  onInput={autoGrow}
                  rows={1}
                  className={`form-input resize-none rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    requiredMissing.errorDetails
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
              </div>
            )}
          </div>

          {/* CONNECTION / SERVICE / WORKFLOW */}
          <div className="form-row mt-2 grid grid-cols-3 gap-2">
            {/* CONNECTION */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                CONNECTION
                {requiredMissing.technology && (
                  <span className="text-red-600"> *</span>
                )}
              </span>
              <div className={`grid grid-cols-3 gap-1 ${techBorder}`}>
                {[
                  { v: "copper", lbl: "Copper", clr: "bg-purple-600" },
                  { v: "", lbl: "None", clr: "bg-gray-400" },
                  { v: "fiber", lbl: "Fiber", clr: "bg-orange-500" },
                ].map((b) => (
                  <button
                    key={b.lbl}
                    onClick={() => setField("technology", b.v)}
                    className={`rounded px-1 py-0.5 text-[11px] ${
                      tech === b.v
                        ? `${b.clr} text-white`
                        : "border border-gray-300 dark:bg-gray-800"
                    }`}
                  >
                    {b.lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* SERVICE */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                SERVICE
                {requiredMissing.service && (
                  <span className="text-red-600"> *</span>
                )}
              </span>
              <select
                name="service"
                value={svc}
                onChange={handleServ}
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.service ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">—</option>
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* WORKFLOW */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                WORKFLOW
                {requiredMissing.workflow && (
                  <span className="text-red-600"> *</span>
                )}
              </span>
              <select
                name="workflow"
                value={issue.workflow}
                onChange={handle}
                disabled={!svc}
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.workflow
                    ? "border-red-500"
                    : "border-gray-300"
                } ${!svc ? "opacity-40" : ""}`}
              >
                <option value="">—</option>
                {workflowOptions.map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Affected */}
          {(svc === "HomePhone" ||
            svc === "Telus Email" ||
            svc === "MyTelus") && (
            <div className="form-row mt-2">
              <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase w-full">
                <span>
                  {svc === "HomePhone"
                    ? "AFFECTED HOME PHONE"
                    : svc === "Telus Email"
                    ? "AFFECTED EMAIL ADDRESS"
                    : "MYTELUS EMAIL"}
                  {requiredMissing.affected && (
                    <span className="text-red-600"> *</span>
                  )}
                </span>
                <input
                  name="affected"
                  value={issue.affected || ""}
                  onChange={handle}
                  autoComplete="new-password"
                  className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    requiredMissing.affected
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
              </label>
            </div>
          )}

          {/* EQUIPMENT CHECKLIST */}
          <EquipmentPanel
            tech={tech}
            service={svc}
            summary={issue.equipSummary || ""}
            onSummaryChange={(txt) => setField("equipSummary", txt)}
          />

          {/* TROUBLESHOOTING */}
          <div className="form-row mt-2">
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase w-full">
              <span>
                TROUBLESHOOTING PROCESS
                {requiredMissing.troubleshooting && (
                  <span className="text-red-600"> *</span>
                )}
              </span>
              <textarea
                name="troubleshooting"
                value={issue.troubleshooting || ""}
                onChange={handle}
                onInput={autoGrow}
                rows={6}
                autoComplete="off"
                className={`shortkey-enabled form-input resize-none rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.troubleshooting ? "border-red-500" : "border-gray-300"
                }`}
              />
            </label>
          </div>

          <div className="mt-2">
            <CollapsibleChecklist section={2} key={resetCount + "-2"} />
          </div>
        </>
      )}
    </FormSection>
  );
}
