export default function StepPlaceholder({ n }) {
  return (
    <div className="rounded border bg-yellow-50 p-6 dark:bg-yellow-900/20">
      <p className="text-yellow-800 dark:text-yellow-200">
        Paso {n} aún no implementado. Próximamente…
      </p>
    </div>
  );
}