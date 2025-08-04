export default function Dashboard() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Tarjetas KPI (ejemplos estáticos) */}
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
          <p className="text-sm text-gray-500">Llamadas totales</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
          <p className="text-sm text-gray-500">% Resueltas en la llamada</p>
          <p className="text-2xl font-bold">0 %</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
          <p className="text-sm text-gray-500">Problema más común</p>
          <p className="text-2xl font-bold">—</p>
        </div>
      </div>
    </div>
  );
} 
