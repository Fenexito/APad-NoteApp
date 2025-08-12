// src/components/ui/NoteModalController.jsx
import { useState, useEffect } from "react";
import ModalFull from "./ModalFull";
import { buildNote } from "../ui/utils/noteBuilder";
import useFormStore from "../../store/useFormStore";

export default function NoteModalController() {
  const data = useFormStore((s) => s.data);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    // cuando alguien dispare window.dispatchEvent(new Event("OPEN_NOTE"))
    const handler = () => {
      setText(buildNote(data));
      setOpen(true);
    };
    window.addEventListener("OPEN_NOTE", handler);
    return () => window.removeEventListener("OPEN_NOTE", handler);
  }, [data]);

  return (
    <ModalFull
      open={open}
      onClose={() => setOpen(false)}
      text={text}
    />
  );
}
