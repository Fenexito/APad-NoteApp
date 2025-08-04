import { useWizardStore } from "../../store/useFormStore";
import Button from "../ui/Button";

export default function Step1() {
  const customer = useWizardStore((s) => s.data.customer);
  const updateSection = useWizardStore((s) => s.updateSection);
  const next = useWizardStore((s) => s.next);

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateSection("customer", { [name]: value });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">1. Información del cliente</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Nombre completo
          <input
            name="name"
            value={customer.name}
            onChange={handleChange}
            className="rounded border px-3 py-2 dark:bg-gray-800"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Teléfono
          <input
            name="phone"
            value={customer.phone}
            onChange={handleChange}
            className="rounded border px-3 py-2 dark:bg-gray-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          ID de cuenta
          <input
            name="accountId"
            value={customer.accountId}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2 dark:bg-gray-800"
          />
        </label>
      </div>

      <Button onClick={next} className="bg-blue-600 text-white dark:bg-blue-500">
        Siguiente
      </Button>
    </div>
  );
}