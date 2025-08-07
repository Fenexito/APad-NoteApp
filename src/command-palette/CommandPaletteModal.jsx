import { useCmd } from "./CommandPaletteContext";
import { X } from "lucide-react";

export default function CommandPaletteModal() {
  const { setOpen, query, setQuery, results, run } = useCmd();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm">
      <div className="mt-24 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* header */}
        <div className="flex items-center border-b border-gray-300 dark:border-gray-700 px-3 py-2">
          <input
            autoFocus
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-sm dark:text-white"
          />
          <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black dark:hover:text-white">
            <X size={16}/>
          </button>
        </div>

        {/* results */}
        <ul className="max-h-60 overflow-y-auto">
          {results.length ? results.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => run(c)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span>{c.icon}</span>
                <span className="flex-1">{c.label}</span>
              </button>
            </li>
          )) : (
            <li className="px-3 py-4 text-center text-xs text-gray-500">No match</li>
          )}
        </ul>
      </div>
    </div>
  );
}
