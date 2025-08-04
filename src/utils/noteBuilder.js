export function buildNote(data) {
  const { customer, problem, inspection, resolution } = data;

  // agent name persisted via hook/useDisplayName (localStorage key "agentName")
  const agentName = localStorage.getItem("agentName") || "";
  const agentLine = agentName ? `PFTS | ${agentName}
` : "";

  const customerSection = `CUSTOMER INFORMATION
BAN: ${customer.ban || ""}
CID: ${customer.cid || ""}
CBR: ${customer.cbr || ""}
Caller: ${customer.caller || ""}
Verified By: ${customer.verifiedBy || ""}
Security Questions: ${customer.securityQuestions || ""}
Address: ${customer.address || ""}
XID: ${customer.xid || ""}
Name: ${customer.name || ""}`;

  const problemSection = `ISSUE DETAILS
Affected service(s): ${problem.services?.join(", ") || "N/A"}
Equipment: ${problem.equipment || "N/A"}
Connections reviewed: ${problem.connections?.join(", ") || "N/A"}
Troubleshooting steps:
${problem.steps?.map((s, i) => `${i + 1}. ${s}`).join(", ") || "N/A"}`;

  const inspectionSection = `SYSTEM INSPECTION
Feature: ${inspection.featureName || "N/A"}
Findings: ${inspection.findings || "N/A"}`;

  const resolutionSection = `FINAL RESOLUTION
Status: ${resolution.status}
Ticket: ${resolution.ticketId || "N/A"}
Summary: ${resolution.summary || "N/A"}`;

  return agentLine + [customerSection, problemSection, inspectionSection, resolutionSection].join(", ");
}
