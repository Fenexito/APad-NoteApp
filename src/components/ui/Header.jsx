import { useState } from "react";
import { PencilLine, Check } from "lucide-react";
import useDisplayName from "../../hooks/useDisplayName";

export default function Header() {
  const [name, saveName] = useDisplayName();
  const [editing, setEditing] = useState(!name);
  const [temp, setTemp] = useState(name);

  const submit = () => {
    saveName(temp.trim());
    setEditing(false);
  };

  return (
    <header className="mx-auto mb-4 w-full max-w-[550px] rounded-b-xl bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-2 text-white shadow">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-wide">APAD | NOTEAPP</h1>
          <p className="text-[10px] opacity-80">v2.0.0 — React Preview</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {editing ? (
            <>
              <input
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="w-28 rounded bg-white/20 px-2 py-1 text-xs placeholder:text-white/60 focus:outline-none"
                placeholder="Your name"
                autoComplete="off"
              />
              <button onClick={submit} aria-label="Save name">
                <Check size={16} />
              </button>
            </>
          ) : (
            <>
              <span className="truncate max-w-[80px] text-xs">Agent: {name}</span>
              <button onClick={() => setEditing(true)} aria-label="Edit name">
                <PencilLine size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}