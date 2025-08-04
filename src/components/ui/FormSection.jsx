export default function FormSection({ title, children }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow dark:bg-gray-800">
      <h2 className="mb-4 text-lg font-semibold text-blue-600 dark:text-blue-400">{title}</h2>
      {children}
    </section>
  );
}