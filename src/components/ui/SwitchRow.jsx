export default function SwitchRow({ label, value, onChange }) {
  return (
    <label className={`flex items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold uppercase ${value ? "bg-green-200/40" : "bg-red-200/40"}`}>
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={onChange} className="peer sr-only" />
      <span className="relative h-4 w-7 cursor-pointer rounded-full bg-gray-300 peer-checked:bg-green-500 transition-colors">
        <span className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform duration-300 peer-checked:translate-x-3" />
      </span>
    </label>
  );
}
