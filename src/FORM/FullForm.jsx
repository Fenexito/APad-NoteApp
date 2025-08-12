import React, { useState, useMemo, useEffect } from "react";
import ModalFull from "../ui/ModalFull";
import ModalSplit from "../ui/ModalSplit";
import ConfirmModal from "../ui/ConfirmModal";
import Section1 from "./sections/Section1";
import Section2 from "./sections/Section2";
import Section3 from "./sections/Section3";
import Section4 from "./sections/Section4";
import useFormStore from "../../store/useFormStore";
import { buildNote } from "../../utils/noteBuilder";
import { useToast } from "../ui/ToastContext";
import { MANDATES } from "../../mandate/mandateRules";
import Buttons from "./Buttons";
import NoteInfoBar from "../ui/NoteInfoBar";

// ========== VALIDATION HELPERS ==========
const mandatesPerSection = [
  MANDATES.filter((m) => m.section === 1).map((m) => m.id),
  MANDATES.filter((m) => m.section === 2).map((m) => m.id),
  MANDATES.filter((m) => m.section === 3).map((m) => m.id),
  MANDATES.filter((m) => m.section === 4).map((m) => m.id),
];
function mandatesCompleted(checklist, ids) {
  return ids.every(
    (id) =>
      checklist?.[id] === "YES" ||
      checklist?.[id] === "NO" ||
      checklist?.[id] === "NA"
  );
}
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
    ((svc === "HomePhone" || svc === "Telus Email" || svc === "MyTelus") && !i.affected) ||
    !i.troubleshooting
  );
}
function requiredMissingSection3(data) {
  const alerts = data.alerts || [];
  const i = data.issue || {};
  const svc = i.service ?? "";
  const showAWA = svc === "HighSpeed" || svc.startsWith("Optik");
  const awaMissing = showAWA && alerts.length === 0;
  const stepsMissing = showAWA && !(i.awaSteps || "").trim();
  const tvsMissing = !i.tvsUsed;
  const tvsKeyMiss = i.tvsUsed === "Yes" && !(i.tvsKey || "").trim();
  return awaMissing || stepsMissing || tvsMissing || tvsKeyMiss;
}
function requiredMissingSection4(data) {
  const r = data.resolution || {};
  const outcome = r.outcome || "";
  const isTech = outcome === "No | Tech Booked";
  const isFollowUp = outcome.startsWith("No | Follow Up Required");
  const isTicket = [
    "No | BOSR Created",
    "No | NC Ticket Created",
    "Cx ask for a Manager | Unable to de escalate | Escalate to EMT"
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
      return !requiredMissingSection1(data) && mandatesCompleted(checklist, mandatesPerSection[0]);
    case 1:
      return !requiredMissingSection2(data) && mandatesCompleted(checklist, mandatesPerSection[1]);
    case 2:
      return !requiredMissingSection3(data) && mandatesCompleted(checklist, mandatesPerSection[2]);
    case 3:
      return !requiredMissingSection4(data) && mandatesCompleted(checklist, mandatesPerSection[3]);
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
  const raw = (res?.ticketFinal ?? "").replace(/\D/g, ""); // deja solo dígitos
  // si es "0" o "000...0" -> tratar como 0
  const isZero = raw.length > 0 && Number(raw) === 0;
  if (!isZero) return note;

  // Quitar solamente la línea "TICKET: ..."
  return note
    .split("\n")
    .filter((l) => !/^\s*TICKET\s*:/.test(l))
    .join("\n");
}

// ---------- SPLIT NOTE, COPILOT NOTE ---------
function splitNoteFinal(note) {
  if (!note) return [""];
  const lines = note.split("\n");
  const tsIdx = lines.findIndex(l => l.trim().toUpperCase().startsWith("TS STEPS:"));
  if (tsIdx === -1) return simpleSplitWithLabels(note);
  const part1raw = lines.slice(0, tsIdx).join("\n");
  const part2raw = lines.slice(tsIdx).join("\n");
  const addLabel = (text, label) => `${label}\n${text}`;
  let p1 = addLabel(part1raw, "1 / 2");
  let p2 = addLabel(part2raw, "2 / 2");
  if (p1.length <= 999 && p2.length <= 999) return [p1, p2];
  if (p1.length > 999 && p2 <= 999) {
    const p1max = 999 - "1 / 3\n".length;
    const part1a = addLabel(part1raw.slice(0, p1max), "1 / 3");
    const part1b = addLabel(part1raw.slice(p1max), "2 / 3");
    const part2c = addLabel(part2raw, "3 / 3");
    return [part1a, part1b, part2c];
  }
  if (p1 <= 999 && p2.length > 999) {
    const p2max = 999 - "2 / 3\n".length;
    const part2a = addLabel(part2raw.slice(0, p2max), "2 / 3");
    const part2b = addLabel(part2raw.slice(p2max), "3 / 3");
    return [addLabel(part1raw, "1 / 3"), part2a, part2b];
  }
  return simpleSplitWithLabels(note);
}
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
  const idx = lines.findIndex(line =>
    line.trim().toUpperCase().startsWith("CX ISSUE:")
  );
  if (idx !== -1) {
    return lines.slice(idx).join("\n");
  }
  return text;
}

// --------- util para baseline estable ---------
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
    // fallback muy raro si hay algo no serializable
    return String(Date.now());
  }
}

// =========== FULLFORM CON NAVEGACIÓN AVANZADA ==============
export default function FullForm() {
  const data = useFormStore((s) => s.data);
  const reset = useFormStore((s) => s.reset);
  const checklist = useFormStore((s) => s.data.checklist);
  const toast = useToast();

  // Por defecto las dos primeras abiertas
  const [openSections, setOpenSections] = useState(["section1", "section2"]);

  const sectionIndexes = { section1: 0, section2: 1, section3: 2, section4: 3 };

  // --- MODALS y demás ----
  const [showFull, setShowFull] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [copilotUsed, setCopilotUsed] = useState(false);

  // Texto crudo -> normalizado -> ocultar TICKET si corresponde
  const noteTextRaw = useMemo(() => buildNote(data), [data]);
  const noteNorm = useMemo(
    () => normalizeNoteSchedule(noteTextRaw, data?.resolution?.outcome, data?.resolution),
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
    if (baselineKey === null) {
      setBaselineKey(currentKey);
      setPristineVersion(v => v + 1);
    }
  }, [baselineKey, currentKey]);

  // === HANDLER RESET CENTRALIZADO ===
  const handleReset = () => {
    reset();
    setOpenSections(["section1", "section2"]);
    setShowReset(false);
    setCopilotUsed(false);
    setBaselineKey(null);
    setPristineVersion(v => v + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast("Form successfully RESETED", "error");
  };

  // --- NUEVA lógica simple de abrir/cerrar (sin límite de 2) ---
  const handleToggleSection = (sectionName, idx) => {
    const isOpen = openSections.includes(sectionName);

    // Si está abierta e intentan cerrarla, mantenemos la regla de "no cerrar si no está completa"
    if (isOpen) {
      if (!sectionIsComplete(data, checklist, idx)) {
        toast("Complete a Section before closing", "warning");
        return;
      }
      setOpenSections(prev => prev.filter(s => s !== sectionName));
      return;
    }

    // Abrir sin restricciones de cantidad
    setOpenSections(prev => [...prev, sectionName]);
  };

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
    const stepsMissing = showAWA && !(i.awaSteps || "").trim();
    const tvsMissing = !i.tvsUsed;
    const tvsKeyMiss = i.tvsUsed === "Yes" && !(i.tvsKey || "").trim();
    const missingSection3 = { awaMissing, stepsMissing, tvsMissing, tvsKeyMiss };
    const r = data.resolution || {};
    const outcome = r.outcome || "";
    const isTech = outcome === "No | Tech Booked";
    const isFollowUp = outcome.startsWith("No | Follow Up Required");
    const isTicket = [
      "No | BOSR Created",
      "No | NC Ticket Created",
      "Cx ask for a Manager | Unable to de escalate | Escalate to EMT"
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
    return { ...missingSection1, ...missingSection2, ...missingSection3, ...missingSection4 };
  }, [data]);
  const isFormComplete = !Object.values(requiredMissingGlobal).some(Boolean);

  return (
    <div className="form-root mx-auto w-full max-w-[550px] space-y-3 px-2 pb-40">
      <Section1
        open={openSections.includes("section1")}
        onToggle={() => handleToggleSection("section1", 0)}
      />
      <Section2
        open={openSections.includes("section2")}
        onToggle={() => handleToggleSection("section2", 1)}
      />
      <Section3
        open={openSections.includes("section3")}
        onToggle={() => handleToggleSection("section3", 2)}
      />
      <Section4
        open={openSections.includes("section4")}
        onToggle={() => handleToggleSection("section4", 3)}
      />

      {/* --- Modals de vista previa --- */}
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
        // Baseline
        baselineKey={baselineKey}
        pristineVersion={pristineVersion}
      />
    </div>
  );
}
