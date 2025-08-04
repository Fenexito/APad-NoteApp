import { useEffect, useState } from "react";
import { getNotes } from "../db/notes";

export default function History() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    getNotes().then(setNotes);
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Historial</h1>
      <ul className="space-y-4">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
            <p className="text-sm text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
            <pre className="whitespace-pre-wrap">{n.resolution?.summary ?? "Sin resumen"}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
