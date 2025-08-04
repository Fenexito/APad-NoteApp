export function buildNote(data) {
  const { customer, problem, inspection, resolution } = data;

  const customerSection = `CLIENTE:\nNombre: ${customer.name}\nTel: ${customer.phone}\nCuenta: ${customer.accountId}`;

  const problemSection = `PROBLEMA:\nServicios afectados: ${problem.services?.join(", ") || "N/A"}\nEquipo: ${problem.equipment || "N/A"}\nConexiones verificadas: ${problem.connections?.join(", ") || "N/A"}\nPasos de troubleshoot:\n${problem.steps?.map((s, i) => `${i + 1}. ${s}`).join("\n") || "N/A"}`;

  const inspectionSection = `INSPECCIÓN SISTEMA:\nCaracterística: ${inspection.featureName || "N/A"}\nHallazgos: ${inspection.findings || "N/A"}`;

  const resolutionSection = `RESOLUCIÓN:\nEstado: ${resolution.status}\nTicket: ${resolution.ticketId || "N/A"}\nResumen: ${resolution.summary || "N/A"}`;

  return [customerSection, problemSection, inspectionSection, resolutionSection].join("\n\n");
}
