import Modal from "./Modal";
import Button from "./Button";

export default function ModalSplit({ open, onClose, parts }) {
  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="mb-4 text-lg font-bold">Nota dividida</h3>
      {parts.map((p, i) => (
        <div key={i} className="mb-6 rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
          <p className="mb-2 font-semibold">Parte {i + 1}</p>
          <pre className="whitespace-pre-wrap">{p}</pre>
          <Button
            className="mt-2 bg-blue-600 text-white dark:bg-blue-500"
            onClick={() => navigator.clipboard.writeText(p)}
          >
            Copiar parte {i + 1}
          </Button>
        </div>
      ))}
      <div className="flex justify-end">
        <Button onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}