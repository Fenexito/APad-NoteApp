// src/form/FullForm.jsx
import React, { useState, useMemo, useEffect } from "react";
import ModalFull from "../modals/ModalFull";
import ModalSplit from "../modals/ModalSplit";
import ConfirmModal from "../modals/ConfirmModal";
import Section1 from "./sections/Section1";
import Section2 from "./sections/Section2";
import Section3 from "./sections/Section3";
import Section4 from "./sections/Section4";
import useFormStore from "../db/useFormStore";
import { buildNote } from "../ui/utils/noteBuilder";
import { splitNoteFinal } from "../ui/utils/splitnote";
import { useToast } from "../ui/ToastContext";
import { MANDATES } from "./mandateRules";
import Buttons from "./Buttons";
import NoteInfoBar from "../ui/NoteInfoBar";
import useAutoRules from "./useAutoRules";

function requiredMissingSection1(data) {
  const c = data.customer || {};
  const showSecQ = ["Security Questions", "Manual Auth"].includes(c.verifiedBy);
  const secQArr = c.securityQuestions ? c.securityQuestions.split(",") : [];
  return (
    !c.ban ||
    !c.cid ||
    !c.name ||
    !c.cbr ||
    !c.caller ||
    !c.verifiedBy ||
    (showSecQ && secQArr.length < 3)
  );
}

function requiredMissingSection2(data) {
  const i = data.issue || {};
  const svc = i.service ?? "";
  const tech = i.technology ?? "";
  const showDetails = i.errorType === "outage" || i.errorType === "ncError";
  return (
    !i.cxIssue ||
    !i.serviceOnCsr ||
    (svc === "HighSpeed" && tech === "") ||
    !svc ||
    !i.workflow ||
    (showDetails && !i.errorDetails) ||
    ((svc === "HomePhone" || svc === "Telus Email" || svc === "MyTelus") &&
      !i.affected) ||
    !i.troubleshooting
  );
}

function requiredMissingSection3(data) {
  const alerts = data.alerts || [];
  const i = data.issue || {};
  const svc = i.service ?? "";
  const showAWA = svc === "HighSpeed" || svc.startsWith("Optik");
  const awaMissing = showAWA && alerts.length === 0;
  // AWA STEPS sólo es requerido si hay AMBER o RED seleccionadas
  const RED = new Set(["bbDownCong","bbUpCong","avgWifiSlow","slowSome","discSome","lowMemory","manyDevices"]);
  const AMBER = new Set(["slowOne","discOne","pppDown"]);
  const requireSteps = showAWA && alerts.some((k) => RED.has(k) || AMBER.has(k));
  const stepsMissing = requireSteps && !(i.awaSteps || "").trim();
  const tvsMissing = !i.tvsUsed;
  const tvsKeyMiss = i.tvsUsed === "Yes" && !(i.tvsKey || "").trim();
  return awaMissing || stepsMissing || tvsMissing || tvsKeyMiss;
}

function requiredMissingSection4(data) {
  const r = data.resolution || {};
  const outcome = r.outcome || "";
  const isTech = ["No | Tech Booked", "No | BO Support Required | Tech Booked"].includes(outcome);
  const isFollowUp = outcome.startsWith("No | Follow Up Required");
  const isTicket = [
    "No | BOSR Created",
    "No | NC Ticket Created",
  ].includes(outcome);
  const autoTransfer = outcome === "No | Cx needs to be transferred";
  return (
    !r.outcome ||
    (isTech && !r.techCbr) ||
    ((isTech || isFollowUp) && !r.techDate) ||
    ((isTech || isFollowUp) && !r.techTime) ||
    (isTicket && !r.ticketSpecial) ||
    (autoTransfer && !r.transferDept) ||
    !r.ticketFinal
  );
}

function sectionIsComplete(data, checklist, idx) {
  switch (idx) {
    case 0:
      return (
        !requiredMissingSection1(data)
      );
    case 1:
      return (
        !requiredMissingSection2(data)
      );
    case 2:
      return (
        !requiredMissingSection3(data)
      );
    case 3:
      return (
        !requiredMissingSection4(data)
      );
    default:
      return false;
  }
}

function allSectionsComplete(data, checklist) {
  return (
    sectionIsComplete(data, checklist, 0) &&
    sectionIsComplete(data, checklist, 1) &&
    sectionIsComplete(data, checklist, 2) &&
    sectionIsComplete(data, checklist, 3)
  );
}

/* ========= Normalizador DISPATCH/FOLLOW UP ========= */
function normalizeNoteSchedule(note, outcome = "", res = {}) {
  if (!note) return "";
  const lines = String(note).split("\n");
  const base = lines.filter(
    (l) => !/^\s*(DISPATCH|FOLLOW\s*UP)\s*:/.test(l)
  );
  const date = (res?.techDate || "").trim();
  const time = (res?.techTime || "").trim();
  if (!date && !time) return base.join("\n");

  const out = String(outcome || "").toLowerCase();
  let label = "";
  if (out.includes("follow up")) label = "FOLLOW UP";
  else if (out.includes("tech")) label = "DISPATCH";
  else label = "";

  if (!label) return base.join("\n");
  const finalLine = `${label}: ${[date, time].filter(Boolean).join(" | ")}`;

  const idx = base.findIndex((l) =>
    /^\s*(RESOLVED|RESOLUTION|OUTCOME)\s*:/.test(l)
  );
  if (idx !== -1) {
    const arr = [...base];
    arr.splice(idx + 1, 0, finalLine);
    return arr.join("\n");
  }
  return [...base, finalLine].join("\n");
}

/* ========= Post-proceso: ocultar TICKET si es 0 ========= */
function hideTicketIfZero(note, res = {}) {
  if (!note) return "";
  const raw = (res?.ticketFinal ?? "").replace(/\D/g, "");
  const isZero = raw.length > 0 && Number(raw) === 0;
  if (!isZero) return note;

  return note
    .split("\n")
    .filter((l) => !/^\s*TICKET\s*:/.test(l))
    .join("\n");
}

/* ---------- SPLIT NOTE, COPILOT NOTE --------- */
function simpleSplitWithLabels(text) {
  const partes = [];
  let idx = 0;
  while (idx < text.length) {
    const partNum = partes.length + 1;
    const label = `${partNum} / X`;
    const maxlen = 999 - (label.length + 1);
    partes.push(text.slice(idx, idx + maxlen));
    idx += maxlen;
  }
  const total = partes.length;
  return partes.map((txt, i) => `${i + 1} / ${total}\n${txt}`);
}

function buildCopilotNote(text) {
  const lines = text.split("\n");
  const idx = lines.findIndex((line) =>
    line.trim().toUpperCase().startsWith("CX ISSUE:")
  );
  if (idx !== -1) {
    return lines.slice(idx).join("\n");
  }
  return text;
}

/* --------- util para baseline estable --------- */
function computeBaselineKey({ noteText, data, parts, checklist, copilotUsed }) {
  try {
    return JSON.stringify({
      n: noteText || "",
      d: data || {},
      p: parts || [],
      c: checklist || {},
      u: !!copilotUsed,
    });
  } catch {
    return String(Date.now());
  }
}

/* =========== FULLFORM ============== */
export default function FullForm() {
  const data = useFormStore((s) => s.data);
  const reset = useFormStore((s) => s.reset);
  const checklist = useFormStore((s) => s.data.checklist);
  const toast = useToast();

  // acciones del store que el motor de reglas necesita
  const updateSection = useFormStore((s) => s.updateSection);
  const toggleAlert   = useFormStore((s) => s.toggleAlert);
  const clearAlerts   = useFormStore((s) => s.clearAlerts);

  // 4 secciones abiertas por defecto
  const [openSections, setOpenSections] = useState([
    "section1",
    "section2",
    "section3",
    "section4",
  ]);

  // Modales
  const [showFull, setShowFull] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [copilotUsed, setCopilotUsed] = useState(false);

  // Nota normalizada
  const noteTextRaw = useMemo(() => buildNote(data), [data]);
  const noteNorm = useMemo(
    () =>
      normalizeNoteSchedule(
        noteTextRaw,
        data?.resolution?.outcome,
        data?.resolution
      ),
    [noteTextRaw, data?.resolution]
  );
  const noteText = useMemo(
    () => hideTicketIfZero(noteNorm, data?.resolution),
    [noteNorm, data?.resolution]
  );
  const parts = useMemo(() => splitNoteFinal(noteText), [noteText]);

  // Baseline estable
  const currentKey = useMemo(
    () => computeBaselineKey({ noteText, data, parts, checklist, copilotUsed }),
    [noteText, data, parts, checklist, copilotUsed]
  );
  const [baselineKey, setBaselineKey] = useState(null);
  const [pristineVersion, setPristineVersion] = useState(0);

  useEffect(() => {
    if (baselineKey === null) setBaselineKey(currentKey), setPristineVersion((v) => v + 1);
  }, [baselineKey, currentKey]);

  // 🔗 Enchufar reglas automáticas entre secciones (ej. workflow -> AWA alert)
  useAutoRules(data, { updateSection, toggleAlert, clearAlerts });

  // RESET
  const handleReset = () => {
    reset();
    setOpenSections(["section1", "section2", "section3", "section4"]);
    setShowReset(false);
    setCopilotUsed(false);
    setBaselineKey(null);
    setPristineVersion((v) => v + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast("Form successfully RESETED", "error");
  };

  // 🔄 RESET post-guardado (silencioso + expande secciones)
  const resetAfterSave = () => {
    reset(); // limpia store
    setOpenSections(["section1", "section2", "section3", "section4"]); // abrir todas
    setCopilotUsed(false);
    setBaselineKey(null);            // fuerza nuevo snapshot
    setPristineVersion((v) => v + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Toggle sin bloqueo
  const handleToggleSection = (sectionName) => {
    const isOpen = openSections.includes(sectionName);
    if (isOpen) {
      setOpenSections((prev) => prev.filter((s) => s !== sectionName));
      return;
    }
    setOpenSections((prev) => [...prev, sectionName]);
  };

  // Faltantes global (ya con overrides EXPRESS)
  const requiredMissingGlobal = useMemo(() => {
    const c = data.customer || {};
    const showSecQ = ["Security Questions", "Manual Auth"].includes(c.verifiedBy);
    const secQArr = c.securityQuestions ? c.securityQuestions.split(",") : [];
    const missingSection1 = {
      ban: !c.ban,
      cid: !c.cid,
      name: !c.name,
      cbr: !c.cbr,
      caller: !c.caller,
      verifiedBy: !c.verifiedBy,
      securityQuestions: showSecQ && secQArr.length < 3,
    };
    const i = data.issue || {};
    const svc = i.service ?? "";
    const tech = i.technology ?? "";
    const showDetails = i.errorType === "outage" || i.errorType === "ncError";
    const missingSection2 = {
      cxIssue: !i.cxIssue,
      serviceOnCsr: !i.serviceOnCsr,
      technology: svc === "HighSpeed" && tech === "",
      service: !svc,
      workflow: !i.workflow,
      errorDetails: showDetails && !i.errorDetails,
      affected:
        (svc === "HomePhone" && !i.affected) ||
        (svc === "Telus Email" && !i.affected) ||
        (svc === "MyTelus" && !i.affected),
      troubleshooting: !i.troubleshooting,
    };
    const alerts = data.alerts || [];
    const showAWA = svc === "HighSpeed" || svc.startsWith("Optik");
    const awaMissing = showAWA && alerts.length === 0;
    // AWA STEPS solo es requerido si hay AMBER/RED seleccionadas
    const RED_KEYS = new Set(["bbDownCong","bbUpCong","avgWifiSlow","slowSome","discSome","lowMemory","manyDevices"]);
    const AMBER_KEYS = new Set(["slowOne","discOne","pppDown"]);
    const anyAmberRed = alerts.some(k => RED_KEYS.has(k) || AMBER_KEYS.has(k));
    const hideSteps = showAWA && alerts.length > 0 && !anyAmberRed;
    const stepsMissing = showAWA && !hideSteps && !(i.awaSteps || "").trim();
    const tvsMissing = !i.tvsUsed;
    const tvsKeyMiss = i.tvsUsed === "Yes" && !(i.tvsKey || "").trim();
    const missingSection3 = { awaMissing, stepsMissing, tvsMissing, tvsKeyMiss };
    const r = data.resolution || {};
    const outcome = r.outcome || "";
    const isTech = ["No | Tech Booked", "No | BO Support Required | Tech Booked"].includes(outcome);
    const isFollowUp = outcome.startsWith("No | Follow Up Required");
    const isTicket = [
      "No | BOSR Created",
      "No | NC Ticket Created",
    ].includes(outcome);
    const autoTransfer = outcome === "No | Cx needs to be transferred";
    const missingSection4 = {
      outcome: !r.outcome,
      techCbr: isTech && !r.techCbr,
      techDate: (isTech || isFollowUp) && !r.techDate,
      techTime: (isTech || isFollowUp) && !r.techTime,
      ticketSpecial: isTicket && !r.ticketSpecial,
      transferDept: autoTransfer && !r.transferDept,
      ticketFinal: !r.ticketFinal,
    };

    // OVERRIDES EXPRESS
    const isExpress = (data?.ui?.validationProfile || "strict") === "express";

    const finalMissingSection2 = isExpress
      ? {
          ...missingSection2,
          serviceOnCsr: false,
          technology: false,
          errorDetails: false,
          affected: false,
          // ⬇️ NUEVO: quitar Service y Workflow como requeridos en EXPRESS
          service: false,
          workflow: false,
        }
      : missingSection2;

    const finalMissingSection3 = isExpress
      ? { awaMissing: false, stepsMissing: false, tvsMissing: false, tvsKeyMiss: false }
      : missingSection3;

    const finalMissingSection4 = isExpress
      ? {
          ...missingSection4,
          techCbr: false,
          techDate: false,
          techTime: false,
          ticketSpecial: false,
          ticketFinal: false,
        }
      : missingSection4;

    return {
      ...missingSection1,
      ...finalMissingSection2,
      ...finalMissingSection3,
      ...finalMissingSection4,
    };
  }, [data]);

  const isFormComplete = !Object.values(requiredMissingGlobal).some(Boolean);

  // ⬇️ NUEVO: mapas de faltantes por sección (con overrides EXPRESS) para los “✓/✗” del header
  const sectionMissing = useMemo(() => {
    const c = data.customer || {};
    const showSecQ = ["Security Questions", "Manual Auth"].includes(c.verifiedBy);
    const secQArr = c.securityQuestions ? c.securityQuestions.split(",") : [];
    const s1 = {
      ban: !c.ban,
      cid: !c.cid,
      name: !c.name,
      cbr: !c.cbr,
      caller: !c.caller,
      verifiedBy: !c.verifiedBy,
      securityQuestions: showSecQ && secQArr.length < 3,
    };

    const i = data.issue || {};
    const svc = i.service ?? "";
    const tech = i.technology ?? "";
    const showDetails = i.errorType === "outage" || i.errorType === "ncError";
    const s2 = {
      cxIssue: !i.cxIssue,
      serviceOnCsr: !i.serviceOnCsr,
      technology: svc === "HighSpeed" && tech === "",
      service: !svc,
      workflow: !i.workflow,
      errorDetails: showDetails && !i.errorDetails,
      affected:
        (svc === "HomePhone" && !i.affected) ||
        (svc === "Telus Email" && !i.affected) ||
        (svc === "MyTelus" && !i.affected),
      troubleshooting: !i.troubleshooting,
    };

    const alerts = data.alerts || [];
    const showAWA = svc === "HighSpeed" || svc.startsWith("Optik");
    const awaMissing = showAWA && alerts.length === 0;
    const RED_KEYS = new Set(["bbDownCong","bbUpCong","avgWifiSlow","slowSome","discSome","lowMemory","manyDevices"]);
    const AMBER_KEYS = new Set(["slowOne","discOne","pppDown"]);
    const anyAmberRed = alerts.some(k => RED_KEYS.has(k) || AMBER_KEYS.has(k));
    const hideSteps = showAWA && alerts.length > 0 && !anyAmberRed;
    const stepsMissing = showAWA && !hideSteps && !(i.awaSteps || "").trim();
    const tvsMissing = !i.tvsUsed;
    const tvsKeyMiss = i.tvsUsed === "Yes" && !(i.tvsKey || "").trim();
    const s3 = { awaMissing, stepsMissing, tvsMissing, tvsKeyMiss };

    const r = data.resolution || {};
    const outcome = r.outcome || "";
    const isTech = ["No | Tech Booked", "No | BO Support Required | Tech Booked"].includes(outcome);
    const isFollowUp = outcome.startsWith("No | Follow Up Required");
    const isTicket = [
      "No | BOSR Created",
      "No | NC Ticket Created",
    ].includes(outcome);
    const autoTransfer = outcome === "No | Cx needs to be transferred";
    const s4 = {
      outcome: !r.outcome,
      techCbr: isTech && !r.techCbr,
      techDate: (isTech || isFollowUp) && !r.techDate,
      techTime: (isTech || isFollowUp) && !r.techTime,
      ticketSpecial: isTicket && !r.ticketSpecial,
      transferDept: autoTransfer && !r.transferDept,
      ticketFinal: !r.ticketFinal,
    };

    const isExpress = (data?.ui?.validationProfile || "strict") === "express";
    if (isExpress) {
      s2.serviceOnCsr = false;
      s2.technology = false;
      s2.errorDetails = false;
      s2.affected = false;
      s2.service = false;
      s2.workflow = false;

      s3.awaMissing = false;
      s3.stepsMissing = false;
      s3.tvsMissing = false;
      s3.tvsKeyMiss = false;

      s4.techCbr = false;
      s4.techDate = false;
      s4.techTime = false;
      s4.ticketSpecial = false;
      s4.ticketFinal = false;
    }

    return { s1, s2, s3, s4 };
  }, [data]);

  // Estados y abiertos (✓/✗ ahora respetan EXPRESS)
  const s1Complete = !Object.values(sectionMissing.s1).some(Boolean);
  const s2Complete = !Object.values(sectionMissing.s2).some(Boolean);
  const s3Complete = !Object.values(sectionMissing.s3).some(Boolean);
  const s4Complete = !Object.values(sectionMissing.s4).some(Boolean);

  const s1Open = openSections.includes("section1");
  const s2Open = openSections.includes("section2");
  const s3Open = openSections.includes("section3");
  const s4Open = openSections.includes("section4");

  // Clases sugeridas para borde friendly cuando la sección esté cerrada (las usará cada Section)
  const closedBorderClassComplete =
    "rounded-2xl border-2 border-green-400/70 bg-green-50 hover:border-green-500 ring-1 ring-green-300/30 shadow-[0_8px_24px_-14px_rgba(16,185,129,0.30)] transition-colors duration-200";
  const closedBorderClassIncomplete =
    "rounded-2xl border-2 border-red-400/70 bg-red-50 hover:border-red-500 ring-1 ring-red-300/30 shadow-[0_8px_24px_-14px_rgba(239,68,68,0.25)] transition-colors duration-200";

  return (
    <>
      {/* Fondo global con soporte para dark mode */}
      <div className="fixed inset-0 z-0 bg-white dark:bg-gray-900" aria-hidden="true" />
      <div className="relative z-10 isolate form-root mx-auto w-full max-w-[550px] space-y-3 px-2 pb-40 min-h-screen min-h-[100dvh]">
        {/* SIN WRAPPERS: el check/X irá dentro del header de cada Section */}
        <Section1
          open={s1Open}
          onToggle={() => handleToggleSection("section1")}
          // indicador/estilo dentro del header
          statusComplete={s1Complete}
          statusIndicatorTitle={s1Complete ? "✓" : "✗"}
          statusIndicatorClasses={
            s1Complete
              ? "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold bg-green-100 text-green-700 ring-1 ring-green-400"
              : "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold bg-red-100 text-red-700 ring-1 ring-red-400"
          }
          // borde friendly cuando esté cerrada (aplícalo en el root de Section si !open)
          closedBorderClass={
            s1Complete ? closedBorderClassComplete : closedBorderClassIncomplete
          }
        />

        <Section2
          open={s2Open}
          onToggle={() => handleToggleSection("section2")}
          statusComplete={s2Complete}
          statusIndicatorTitle={s2Complete ? "✓" : "✗"}
          statusIndicatorClasses={
            s2Complete
              ? "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold bg-green-100 text-green-700 ring-1 ring-green-400"
              : "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold bg-red-100 text-red-700 ring-1 ring-red-400"
          }
          closedBorderClass={
            s2Complete ? closedBorderClassComplete : closedBorderClassIncomplete
          }
        />

        <Section3
          open={s3Open}
          onToggle={() => handleToggleSection("section3")}
          statusComplete={s3Complete}
          statusIndicatorTitle={s3Complete ? "✓" : "✗"}
          statusIndicatorClasses={
            s3Complete
              ? "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold bg-green-100 text-green-700 ring-1 ring-green-400"
              : "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold bg-red-100 text-red-700 ring-1 ring-red-400"
          }
          closedBorderClass={
            s3Complete ? closedBorderClassComplete : closedBorderClassIncomplete
          }
        />

        <Section4
          open={s4Open}
          onToggle={() => handleToggleSection("section4")}
          statusComplete={s4Complete}
          statusIndicatorTitle={s4Complete ? "✓" : "✗"}
          statusIndicatorClasses={
            s4Complete
              ? "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold bg-green-100 text-green-700 ring-1 ring-green-400"
              : "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold bg-red-100 text-red-700 ring-1 ring-red-400"
          }
          closedBorderClass={
            s4Complete ? closedBorderClassComplete : closedBorderClassIncomplete
          }
        />

        {/* Modals */}
        <ModalFull open={showFull} onClose={() => setShowFull(false)} note={noteText} />
        <ModalSplit open={showSplit} onClose={() => setShowSplit(false)} parts={parts} />
        <ConfirmModal
          open={showReset}
          title="Reset all fields?"
          description="All information entered in the form will be lost."
          onConfirm={handleReset}
          onCancel={() => {
            setShowReset(false);
            toast("CANCEL reset request", "neutral");
          }}
        />

        <NoteInfoBar
          ban={data.customer?.ban}
          cid={data.customer?.cid}
          name={data.customer?.name}
          cbr={data.customer?.cbr}
          noteText={noteText}
          toast={toast}
        />

        <Buttons
          noteText={noteText}
          parts={parts}
          setShowFull={setShowFull}
          setShowSplit={setShowSplit}
          setShowReset={setShowReset}
          copilotUsed={copilotUsed}
          setCopilotUsed={setCopilotUsed}
          isFormComplete={isFormComplete}
          checklist={checklist}
          buildCopilotNote={buildCopilotNote}
          toast={toast}
          data={data}
          reset={reset}
          handleReset={handleReset}
          baselineKey={baselineKey}
          pristineVersion={pristineVersion}
          resetAfterSave={resetAfterSave}
        />
      </div>
    </>
  );
}
