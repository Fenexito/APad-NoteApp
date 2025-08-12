// src/pages/History.jsx
import { useEffect, useMemo, useState } from "react";
import Header from "../components/ui/Header";
import HistoryBar from "../components/ui/HistoryBar";
import { lazy, Suspense } from "react";
 const ModalSplit = lazy(() => import("../components/ui/ModalSplit"));
 const ModalFull = lazy(() => import("../components/ui/ModalFull"));
 const ModalEditNote = lazy(() => import("../components/ui/ModalEditNote"));
import { useToast } from "../components/ui/ToastContext";
const ConfirmModal = lazy(() => import("../components/ui/ConfirmModal"));

import { getNotes, updateNote, deleteNote } from "../db/notes";
import HistoryList from "../components/history/HistoryList";

import { parseMetaFromText } from "../utils/history";

export default function History() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");

  const [showSplit, setShowSplit] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // DELETE modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const toast = useToast();

  /* ========= carga inicial ========= */
  useEffect(() => {
    getNotes().then(setNotes);
  }, []);

  /* ========= sincronizar editor ========= */
  useEffect(() => {
    if (selectedNote) setEditedText(selectedNote.text || "");
  }, [selectedNote]);

  const canSplit = !!selectedNote && selectedNote.text?.length > 999;

  /* ========= split helper ========= */
  const splitNoteFinal = (text) => {
    if (!text) return [""];
    const parts = [];
    for (let i = 0; i < text.length; i += 999) parts.push(text.slice(i, i + 999));
    return parts;
  };
  const parts = canSplit ? splitNoteFinal(selectedNote.text) : [];

  /* ========= acciones ========= */
  const handleCopy = () => {
    if (!selectedNote) return;
    navigator.clipboard.writeText(selectedNote.text || "");
    toast && toast("Note copied!", "success");
  };
  const handleSee = () => {
    if (!selectedNote) return;
    setShowViewModal(true);
  };
  const handleEdit = () => {
    if (!selectedNote) return;
    setShowViewModal(false); // cierra lectura antes de abrir edición
    setIsEditing(true);
    setEditedText(selectedNote.text || "");
    setShowEditModal(true);
  };
  const handleSave = async () => {
    if (!selectedNote) return;
    // Parseo seguro (no bloquea guardado si algo falla)
    let meta = {};
    try {
      meta = parseMetaFromText(editedText);
    } catch {
      meta = {};
    }
    const safe = (v, prev) => (v && v !== v?.toUpperCase() ? v : prev); // evita "LABEL: LABEL"

    // Construcción base
    let updated = {
      ...selectedNote,
      text: editedText,
      // top-level para render rápido
      service: safe(meta.service, selectedNote.service),
      workflow: safe(meta.workflow, selectedNote.workflow),
      ticket: safe(meta.ticket, selectedNote.ticket),
      bosrTicket: safe(meta.bosrTicket, selectedNote.bosrTicket),
      ncTicket: safe(meta.ncTicket, selectedNote.ncTicket),
      emtTicket: safe(meta.emtTicket, selectedNote.emtTicket),
      // espejo en resolution
      resolution: {
        ...(selectedNote.resolution || {}),
        summary: safe(meta.resolutionText, selectedNote.resolution?.summary),
        outcome: safe(meta.resolutionText, selectedNote.resolution?.outcome),
        techDate: safe(meta.techDate, selectedNote.resolution?.techDate),
        techTime: safe(meta.techTime, selectedNote.resolution?.techTime),
        followUpDate: safe(meta.followUpDate, selectedNote.resolution?.followUpDate),
        followUpTime: safe(meta.followUpTime, selectedNote.resolution?.followUpTime),
        ticketSpecial: safe(meta.specialTicket, selectedNote.resolution?.ticketSpecial),
      },
    };

    // Normaliza duplicados por outcome
    const outcomeLower = (updated.resolution.outcome || "").toLowerCase();
    if (outcomeLower.includes("follow up")) {
      updated = {
        ...updated,
        resolution: {
          ...updated.resolution,
          techDate: "",
          techTime: "",
        },
      };
    } else if (outcomeLower.includes("tech")) {
      updated = {
        ...updated,
        resolution: {
          ...updated.resolution,
          followUpDate: "",
          followUpTime: "",
        },
      };
    }

    // Limpia cualquier campo top-level legado
    delete updated.techDate;
    delete updated.techTime;
    delete updated.followUpDate;
    delete updated.followUpTime;

    try {
      await updateNote(updated);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setSelectedNote(updated);
      setIsEditing(false);
      setShowEditModal(false); // cierra al guardar
      toast && toast("Note updated!", "success");
    } catch (e) {
      console.error(e);
      toast && toast("Update failed!", "error");
    }
  };
  const handleCancel = () => {
    setIsEditing(false);
    setEditedText(selectedNote?.text || "");
    setShowEditModal(false);
    toast && toast("Edit canceled", "neutral");
  };

  // DELETE flow
  const handleDelete = () => {
    if (!selectedNote) {
      toast && toast("Select a note to delete", "warning");
      return;
    }
    setShowDeleteModal(true);
  };
  const handleConfirmDelete = async () => {
    try {
      await deleteNote(selectedNote.id);
      setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
      // Cierra y limpia UI
      setShowDeleteModal(false);
      setShowViewModal(false);
      setShowEditModal(false);
      setIsEditing(false);
      setSelectedNote(null);
      toast && toast("Note deleted", "success");
    } catch (e) {
      console.error(e);
      toast && toast("Delete failed", "error");
      setShowDeleteModal(false);
    }
  };

  const handleSplit = () => setShowSplit(true);
  const handleCopilot = () => {
    if (!selectedNote) return;
    const buildCopilotNote = (text) => {
      const lines = text.split("\n");
      const idx = lines.findIndex((line) =>
        line.trim().toUpperCase().startsWith("CX ISSUE:")
      );
      if (idx !== -1) return lines.slice(idx).join("\n");
      return text;
    };
    navigator.clipboard.writeText(buildCopilotNote(selectedNote.text || ""));
    toast && toast("Copilot note copied!", "success");
  };
  const handleResolution = () => {
    if (!selectedNote) return;
    const text = selectedNote.text || "";
    const cxIssueMatch = text.match(/^CX ISSUE:.*(?:\n(?![A-Z ]+:).*)*/m);
    const tsStepsMatch = text.match(/^TS STEPS:.*(?:\n(?![A-Z ]+:).*)*/m);

    let toCopy = "";
    if (!cxIssueMatch && !tsStepsMatch) {
      toast && toast("CX ISSUE & TS STEPS are empty", "warning");
      return;
    }
    if (cxIssueMatch && !tsStepsMatch) {
      toast && toast("TS STEPS is empty", "warning");
      toCopy = cxIssueMatch[0];
    } else if (!cxIssueMatch && tsStepsMatch) {
      toast && toast("CX ISSUE is empty", "warning");
      toCopy = tsStepsMatch[0];
    } else {
      toCopy = `${cxIssueMatch[0]}\n${tsStepsMatch[0]}`;
      if (toCopy.length > 999) {
        toCopy = tsStepsMatch[0];
        toast && toast("CX ISSUE + TS STEPS exceed 999, only TS STEPS copied.", "warning");
      } else {
        toast && toast("RESOLUTION copied to clipboard", "success");
      }
    }
    navigator.clipboard.writeText(toCopy);
  };

  return (
    <div className="min-h-screen surface pb-24">
      <Header />

      {/* Lista/Buscador/Meses-Días-Notas */}
      <HistoryList
        notes={notes}
        selectedNote={selectedNote}
        setSelectedNote={setSelectedNote}
        onOpenView={() => setShowViewModal(true)}
      />

      {/* Sticky inferior (acciones) */}
      <HistoryBar
        selectedNote={selectedNote}
        isEditing={isEditing}
        canSplit={canSplit}
        onCopy={handleCopy}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSee={handleSee}
        onSplit={handleSplit}
        onCopilot={handleCopilot}
        onResolution={handleResolution}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      <Suspense fallback={null}>
        {/* Split modal */}
        <ModalSplit
          open={showSplit}
          onClose={() => setShowSplit(false)}
          parts={parts}
        />

        {/* Modal de lectura */}
        <ModalFull
          open={showViewModal}
          onClose={() => setShowViewModal(false)}
          note={selectedNote?.text || ""}
        />

        {/* Modal de edición */}
        <ModalEditNote
          open={showEditModal}
          onClose={handleCancel}
          note={{ ...selectedNote, text: editedText }}
          onChangeText={setEditedText}
        />

        {/* Confirmación de borrado */}
        <ConfirmModal
          open={showDeleteModal}
          title="Delete note"
          description="This action cannot be undone. Do you want to delete this note?"
          confirmText="Delete"
          confirmTone="danger"
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
        />
      </Suspense>
    </div>
  );
}
