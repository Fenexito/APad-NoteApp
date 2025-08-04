import { useCallback } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";

export default function CommandPalette() {
  const navigate = useNavigate();

  const actions = [
    { name: "Nueva nota", shortcut: "n", onSelect: () => navigate("/") },
    { name: "Historial", shortcut: "h", onSelect: () => navigate("/history") },
    { name: "Dashboard", shortcut: "d", onSelect: () => navigate("/dashboard") },
    { name: "Tema claro/oscuro", shortcut: "t", onSelect: () => document.querySelector("[aria-label='Toggle theme']").click() },
  ];

  const handleKeyDown = useCallback((e) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      document.getElementById("cmdk-root").showPicker();
    }
  }, []);

  return (
    <Command
      id="cmdk-root"
      onKeyDownCapture={handleKeyDown}
      className="cmdk absolute left-1/2 top-24 z-[60] hidden w-[90vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800"
    >
      <Command.Input className="w-full border-none bg-transparent p-4 text-lg outline-none" placeholder="Buscar..." />
      <Command.List className="max-h-60 overflow-y-auto">
        {actions.map((a) => (
          <Command.Item key={a.name} onSelect={a.onSelect} className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            {a.name}
            <span className="ml-auto text-xs text-gray-400">{a.shortcut}</span>
          </Command.Item>
        ))}
      </Command.List>
    </Command>
  );
}
