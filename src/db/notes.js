// src/db/notes.js
import { openDB } from "idb";

const DB_NAME = "noteapp-db";
const STORE = "notes";

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    },
  });
}

export async function addNote(note) {
  const db = await getDB();
  const id =
    note?.id ??
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(36).slice(2));
  const createdOriginal =
    note?.createdAt ?? note?.created ?? note?.timestamp ?? new Date().toISOString();

    // 🔧 Asegura que siempre exista 'text' (algunas rutas usan finalNoteText)
  const text = note?.text ?? note?.finalNoteText ?? "";

  await db.put(STORE, {
    ...note,
    id,
    text,
    createdAt: createdOriginal,
    created: note?.created ?? createdOriginal,
    timestamp: note?.timestamp ?? createdOriginal,
  });

  // 🔔 Notificar cambio de notas (para que el widget se sincronice)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("notes:changed", { detail: { op: "add", id } }));
  }
}

export async function getNotes() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function updateNote(note) {
  const db = await getDB();
  // ⚙️ Asegurar 'text' por si viene como finalNoteText
  const next = { ...note, text: note?.text ?? note?.finalNoteText ?? "" };
  await db.put(STORE, next);
  // 🔔 Notificar cambio de notas (para refrescar History)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("notes:changed", { detail: { op: "update", id: next?.id } }));
  }
}

export async function deleteNote(id) {
  const db = await getDB();
  await db.delete(STORE, id);

  // 🔔 Notificar cambio de notas
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("notes:changed", { detail: { op: "delete", id } }));
  }
}

// 👇 Upsert masivo para sincronizar lo que baja del Sheet a IndexedDB (sin eventos)
export async function upsertNotesBulk(notesArr = []) {
  if (!Array.isArray(notesArr) || !notesArr.length) return 0;
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  for (const n of notesArr) {
    if (!n?.id) continue;
    await store.put(n);
  }
  await tx.done;
  return notesArr.length;
}
