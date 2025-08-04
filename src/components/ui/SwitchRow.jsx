export default function SwitchRow({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-lg px-2 py-1 text-xs font-medium" style={{ background: value ? "#16a34a22" : "#dc262622" }}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="relative h-4 w-8 cursor-pointer rounded-full bg-gray-300 peer-checked:bg-green-500">
        <span className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
