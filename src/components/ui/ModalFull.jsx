import Modal from "./Modal";
import Button from "./Button";

export default function ModalFull({ open, onClose, text }) {
  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="mb-4 text-lg font-bold">Nota completa</h3>
      <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded bg-gray-100 p-4 dark:bg-gray-900">
        {text}
      </pre>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          className="bg-blue-600 text-white dark:bg-blue-500"
          onClick={() => navigator.clipboard.writeText(text)}
        >
          Copiar todo
        </Button>
        <Button onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}