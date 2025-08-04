export default function FormSection({ title, children }) {
  return (
    <section className="rounded-lg bg-white p-2 shadow dark:bg-gray-800">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
        {title}
      </h2>
      {children}
    </section>
  );
}
