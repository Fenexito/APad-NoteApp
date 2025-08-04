import { openDB } from "idb";

const DB_NAME = "noteapp-db";
const STORE = "notes";     // una sola store

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: "id" });
    },
  });
}

export async function addNote(note) {
  const db = await getDB();
  await db.put(STORE, { ...note, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
}

export async function getNotes() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function updateNote(note) {
  const db = await getDB();
  await db.put(STORE, note);
}

export async function deleteNote(id) {
  const db = await getDB();
  await db.delete(STORE, id);
}
