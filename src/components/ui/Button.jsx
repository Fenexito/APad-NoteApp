export default function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`rounded-2xl px-4 py-2 font-semibold shadow transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:ring-offset-gray-900 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
