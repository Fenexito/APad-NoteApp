import { useWizardStore } from "../../store/useFormStore";
import Step1 from "./Step1";
import StepPlaceholder from "./StepPlaceholder";
import { buildNote } from "../../utils/noteBuilder";
import { splitNote } from "../../utils/splitNote";
import ModalFull from "../ui/ModalFull";
import ModalSplit from "../ui/ModalSplit";
import { useState } from "react";

export default function Wizard() {
  const step = useWizardStore((s) => s.step);
  const data = useWizardStore((s) => s.data);

  const [showFull, setShowFull] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  const noteText = buildNote(data);
  const parts = splitNote(noteText);

  const openPreview = () => {
    parts.length === 1 ? setShowFull(true) : setShowSplit(true);
  };

  return (
    <>
      {step === 1 && <Step1 />}
      {step > 1 && step < 5 && <StepPlaceholder n={step} />}

      {/* Botón para probar la generación de nota */}
      <div className="mt-8">
        <button
          className="rounded bg-green-600 px-4 py-2 font-semibold text-white dark:bg-green-500"
          onClick={openPreview}
        >
          Previsualizar nota
        </button>
      </div>

      <ModalFull open={showFull} onClose={() => setShowFull(false)} text={noteText} />
      <ModalSplit open={showSplit} onClose={() => setShowSplit(false)} parts={parts} />
    </>
  );
}