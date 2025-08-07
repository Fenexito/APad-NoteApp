// -----------------------------------------------------------------------------
// FullForm.jsx – integra Section1, Section2 y ahora Section3
// -----------------------------------------------------------------------------
import { useState, useMemo } from "react";
import { useFormStore } from "../../store/useFormStore";
import { buildNote } from "../../utils/noteBuilder";
import { splitNote } from "../../utils/splitNote";

/* UI */
import Button     from "../ui/Button";
import ModalFull  from "../ui/ModalFull";
import ModalSplit from "../ui/ModalSplit";

/* Secciones numeradas */
import Section1 from "./sections/Section1";
import Section2 from "./sections/Section2";
import Section3 from "./sections/Section3";
import Section4 from "./sections/Section4";

export default function FullForm() {
  const data = useFormStore((s) => s.data);

  /* ---------- Vista previa ---------- */
  const [showFull, setShowFull] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  const noteText = useMemo(() => buildNote(data), [data]);
  const parts    = useMemo(() => splitNote(noteText), [noteText]);

  const openPreview = () =>
    parts.length === 1 ? setShowFull(true) : setShowSplit(true);

  /* ---------- Validación global (mínima) ---------- */
  const requiredMissing = (() => {
    /* Sección 1 */
    if (!data.customer.ban || !data.customer.cid || !data.customer.name || !data.customer.cbr) return true;
    if (!data.customer.caller || !data.customer.verifiedBy) return true;
    const needsSecQ = ["Security Questions", "Manual Auth"].includes(data.customer.verifiedBy);
    if (needsSecQ) {
      const count = data.customer.securityQuestions ? data.customer.securityQuestions.split(",").length : 0;
      if (count < 3) return true;
    }

    /* Sección 2 */
    if (!data.issue.serviceOnCsr || !data.issue.cxIssue) return true;
    if ((data.issue.errorType === "outage" || data.issue.errorType === "ncError") && !data.issue.errorDetails) return true;

    /* Sección 3 no es obligatoria por el momento */
    return false;
  })();

  /* ---------- JSX ---------- */
  return (
    <div className="mx-auto w-full max-w-[550px] space-y-3 px-2 pb-6">
      <Section1 />
      <Section2 />
      <Section3 />
      <Section4 />

      {/* Modals */}
      <ModalFull  open={showFull}  onClose={() => setShowFull(false)}  text={noteText} />
      <ModalSplit open={showSplit} onClose={() => setShowSplit(false)} parts={parts} />
    </div>
  );
}
