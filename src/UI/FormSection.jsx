export default function FormSection({ title, children, className = "" }) {
  return (
    <section className={`rounded-lg bg-white dark:bg-gray-800 p-2 shadow ${className}`}>
      {title && (
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
