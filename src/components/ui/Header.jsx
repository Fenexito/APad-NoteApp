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
    <header className="mx-auto mb-3 w-full max-w-[550px] rounded-b-lg bg-gradient-to-r from-blue-600 to-blue-500 px-2 py-1.5 text-white shadow">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold tracking-wide">APAD | NOTEAPP</h1>
          <p className="text-[9px] opacity-80">v2.0.0 — React Preview</p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="font-semibold">PFTS&nbsp;|</span>
          {editing ? (
            <>
              <input
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="w-32 rounded bg-white/20 px-1 py-0.5 placeholder:text-white/60 focus:outline-none"
                placeholder="Name"
                autoComplete="new-password"
              />
              <button onClick={submit} aria-label="Save name">
                <Check size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="truncate max-w-[130px] text-left focus:outline-none"
              aria-label="Edit name"
            >
              {name}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}