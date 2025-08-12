import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/ui/Header";
import ButtonsShortkeys from "../SHORTKEYS/ButtonsShortkeys";

import {
  loadShortcuts,
  saveShortcuts,
  exportShortcutsJSON,
  importShortcutsJSON,
  makeEmptyShortcut } from
"../SHORTKEYS/store";
import ShortkeyList from "../SHORTKEYS/ShortkeyList";
import ShortkeyEditor from "../SHORTKEYS/ShortkeyEditor";
import ConfirmModal from "../components/ui/ConfirmModal";

export default function ShortKeys() {
  const navigate = useNavigate();

  const [items, setItems] = useState(() => loadShortcuts());
  const [view, setView] = useState("list"); // "list" | "editor"
  const [editing, setEditing] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteKey, setPendingDeleteKey] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {document.title = "Shortkeys Editor";}, []);
  useEffect(() => {saveShortcuts(items);}, [items]);

  const goList = () => {setEditing(null);setView("list");};

  /* === LISTA === */
  const handleAdd = () => {
    // NEW SIEMPRE SIN VARIABLES (solo plantilla)
    const empty = {
      key: "",
      tags: [],
      steps: [{ id: "result", type: "template", template: "" }],
      _forceSimple: true,
      _tempId: Date.now() // para forzar remount del editor
    };
    setEditing(empty);
    setView("editor");
    setDirty(false);
    setSelectedKey(empty.key || null);
  };

  const handleEdit = (shortcut) => {
    const copy = JSON.parse(JSON.stringify(shortcut));
    delete copy._forceSimple;
    copy._tempId = Date.now(); // para remount limpio entre diferentes shortkeys
    setEditing(copy);
    setView("editor");
    setDirty(false);
    setSelectedKey(shortcut.key || null);
  };

  const actuallyDelete = (key) => {
    setItems((prev) => prev.filter((x) => x.key !== key));
    if (selectedKey === key) setSelectedKey(null);
  };

  const handleDuplicate = (shortcut) => {
    const copy = JSON.parse(JSON.stringify(shortcut));
    copy.key = `${shortcut.key}-copy`;
    setItems((prev) => [copy, ...prev]);
    setSelectedKey(copy.key);
  };

  const handleMove = (key, dir) => {
    setItems((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  };

  const handleExport = () => exportShortcutsJSON(items);
  const handleImport = async () => {
    const imported = await importShortcutsJSON();
    if (!imported) return;
    if (!Array.isArray(imported)) return alert("JSON inválido.");
    if (!confirm("Esto reemplazará los shortkeys actuales. ¿Continuar?")) return;
    setItems(imported);
    setSelectedKey(null);
  };

  /* === EDITOR === */
  const handleSave = (payload) => {
    const clean = { ...payload };
    delete clean._forceSimple;
    delete clean._tempId;
    setItems((prev) => {
      const exists = prev.some((x) => x.key === clean.key);
      if (exists) return prev.map((x) => x.key === clean.key ? clean : x);
      return [clean, ...prev];
    });
    setDirty(false);
    setEditing(null);
    setView("list");
    setSelectedKey(clean.key);
  };

  const inEditor = view === "editor";
  const canEdit = view === "list" && !!selectedKey;
  const canDuplicate = view === "list" && !!selectedKey || view === "editor" && !!editing;
  const canDelete = view === "list" && !!selectedKey; // deshabilitado en editor

  const canSave = useMemo(() => {
    if (!editing) return false;
    const keyOk = !!editing.key;
    const tpl = (editing.steps || []).find((s) => s.type === "template")?.template || "";
    return keyOk && !!tpl.trim();
  }, [editing]);

  const onNew = () => handleAdd();
  const onDuplicate = () => {
    if (inEditor && editing) return handleSave(editing);
    const found = items.find((it) => it.key === selectedKey);
    if (!found) return alert("Selecciona un shortkey primero.");
    handleDuplicate(found);
  };
  const onEdit = () => {
    if (!inEditor) {
      const found = items.find((it) => it.key === selectedKey);
      if (!found) return alert("Selecciona un shortkey primero.");
      return handleEdit(found);
    }
    if (dirty) setShowCancelConfirm(true);else
    goList();
  };
  const onDelete = () => {
    if (inEditor) return;
    if (!selectedKey) return alert("Selecciona un shortkey primero.");
    setPendingDeleteKey(selectedKey);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="min-h-screen surface pb-24">
      <Header />

      {view === "list" &&
      <ShortkeyList
        items={items}
        selectedKey={selectedKey}
        onSelect={(k) => setSelectedKey(k)}
        onSelectKey={(k) => setSelectedKey(k)}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onMove={handleMove}
        onExport={handleExport}
        onImport={handleImport}
        onDelete={(key) => {
          setPendingDeleteKey(key);
          setShowDeleteConfirm(true);
        }} />

      }

      {view === "editor" &&
      <div id="view-editor" className="pt-3">
          <ShortkeyEditor
          key={editing && editing._tempId || "new"} // <- solo _tempId; @key ya no remonta el componente
          value={editing}
          onChange={(draft) => {
            setEditing(draft);
            setDirty(true);
          }} />
        
        </div>
      }

      <ButtonsShortkeys
        onNew={onNew}
        onDuplicate={onDuplicate} // en editor actúa como SAVE
        onEdit={onEdit} // en editor actúa como CANCEL (modal)
        onDelete={onDelete}
        canDuplicate={canDuplicate}
        canEdit={canEdit}
        canDelete={canDelete}
        inEditor={inEditor}
        onSave={() => handleSave(editing)}
        onCancel={() => {
          if (dirty) setShowCancelConfirm(true);else
          goList();
        }}
        canSave={canSave} />
      

      {/* ELIMINAR */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="Eliminar shortkey"
        description={
        pendingDeleteKey ?
        `Esta acción no se puede deshacer.\n¿Quieres eliminar @${pendingDeleteKey}?` :
        "Esta acción no se puede deshacer."
        }
        confirmText="Eliminar"
        confirmTone="danger"
        cancelText="Cancelar"
        onCancel={() => {
          setShowDeleteConfirm(false);
          setPendingDeleteKey(null);
        }}
        onConfirm={() => {
          if (pendingDeleteKey) actuallyDelete(pendingDeleteKey);
          setShowDeleteConfirm(false);
          setPendingDeleteKey(null);
        }} />
      

      {/* CANCELAR edición/creación */}
      <ConfirmModal
        open={showCancelConfirm}
        title="Salir sin guardar"
        description="Tienes cambios sin guardar. ¿Qué deseas hacer?"
        cancelText="Seguir editando"
        secondaryText="Guardar y salir"
        secondaryTone="success"
        secondaryDisabled={!canSave}
        onSecondary={() => {
          if (!editing || !canSave) return;
          handleSave(editing);
          setShowCancelConfirm(false);
        }}
        confirmText="Descartar"
        confirmTone="warning"
        onCancel={() => setShowCancelConfirm(false)}
        onConfirm={() => {
          setShowCancelConfirm(false);
          setDirty(false);
          goList();
        }} />
      
    </div>);

}