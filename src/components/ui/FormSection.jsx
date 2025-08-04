export default function FormSection({ title, children }) {
  return (
    <section className="rounded-xl bg-white p-3 shadow dark:bg-gray-800">
      <h2 className="mb-3 text-base font-semibold text-blue-600 dark:text-blue-400">{title}</h2>
      {children}
    </section>
  );
}
