export function buildNote(data) {
  const { customer, problem, inspection, resolution } = data;

  const customerSection = `CUSTOMER INFORMATION\nBAN: ${customer.ban || ""}\nCID: ${customer.cid || ""}\nCBR: ${customer.cbr || ""}\nCaller: ${customer.caller || ""}\nVerified By: ${customer.verifiedBy || ""}\nSecurity Questions: ${customer.securityQuestions || ""}\nAddress: ${customer.address || ""}\nXID: ${customer.xid || ""}\nName: ${customer.name || ""}\nPhone: ${customer.phone || ""}\nAccount ID: ${customer.accountId || ""}`;

  const problemSection = `ISSUE DETAILS\nAffected service(s): ${problem.services?.join(", ") || "N/A"}\nEquipment: ${problem.equipment || "N/A"}\nConnections reviewed: ${problem.connections?.join(", ") || "N/A"}\nTroubleshooting steps:\n${problem.steps?.map((s, i) => `${i + 1}. ${s}`).join("\n") || "N/A"}`;

  const inspectionSection = `SYSTEM INSPECTION\nFeature: ${inspection.featureName || "N/A"}\nFindings: ${inspection.findings || "N/A"}`;

  const resolutionSection = `FINAL RESOLUTION\nStatus: ${resolution.status}\nTicket: ${resolution.ticketId || "N/A"}\nSummary: ${resolution.summary || "N/A"}`;

  return [customerSection, problemSection, inspectionSection, resolutionSection].join("\n\n");
}