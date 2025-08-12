// src/shortkeys/store.js
export const LS_KEY = "userShortkeys";

export function loadShortcuts() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveShortcuts(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items || []));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function makeEmptyShortcut() {
  return {
    key: "",
    description: "",
    steps: [
      {
        id: "variable_1",
        type: "select",
        prompt: "¿Primera decisión?",
        options: [
          { label: "Opción A", value: "A", nextStep: "result" },
          { label: "Opción B", value: "B", nextStep: "result" },
        ],
      },
      {
        id: "result",
        type: "template",
        template: "Elegiste {variable_1}.",
      },
    ],
  };
}

export function exportShortcutsJSON(items) {
  const blob = new Blob([JSON.stringify(items || [], null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shortkeys.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importShortcutsJSON() {
  return new Promise((resolve) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json";
    inp.onchange = () => {
      const file = inp.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          resolve(data);
        } catch {
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    inp.click();
  });
}
