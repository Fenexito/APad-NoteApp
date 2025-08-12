// src/notebuilder.js

export function buildNote(data) {
  const { customer = {}, issue = {}, alerts = [], resolution = {} } = data || {};
  const lines = [];

  // — AGENTE —
  const agentName = localStorage.getItem("agentName") || "";
  if (agentName) {
    lines.push(`PFTS | ${agentName}`);
  }

  // — CUSTOMER —
  if (customer.ban)   lines.push(`BAN: ${customer.ban}`);
  if (customer.cid)   lines.push(`CID: ${customer.cid}`);
  if (customer.name)  lines.push(`NAME: ${customer.name}`);
  if (customer.cbr)   lines.push(`CBR: ${customer.cbr}`);
  if (customer.caller)lines.push(`CALLER: ${customer.caller}`);

  if (customer.verifiedBy) {
    const mapSQ = (q) => {
      switch ((q || "").trim()) {
        case "Primary Phone #":            return "Phone 1";
        case "Secondary Phone #":          return "Phone 2";
        case "Email Address":              return "Email";
        case "Address & Postal Code":
          return "Address";
        default:
          return (q || "").trim();
      }
    };
    const sqs = (customer.securityQuestions || "")
      .split(",")
      .map(mapSQ)
      .filter(Boolean)
      .join(", ");
    lines.push(
      sqs
        ? `VERIFIED BY: ${customer.verifiedBy}, ${sqs}`
        : `VERIFIED BY: ${customer.verifiedBy}`
    );
  }

  if (customer.address)   lines.push(`ADDRESS: ${customer.address}`);
  if (customer.xid)       lines.push(`XID: ${customer.xid}`);
  if (customer.phone)     lines.push(`PHONE: ${customer.phone}`);
  if (customer.accountId) lines.push(`ACCOUNT ID: ${customer.accountId}`);

  // — STATUS, ISSUE & TROUBLESHOOT —
  if (issue.cxIssue)      lines.push(`CX ISSUE: ${issue.cxIssue}`);
  if (issue.serviceOnCsr) lines.push(`SERVICE ON CSR: ${issue.serviceOnCsr}`);

  // ERROR / OUTAGE / NC  (con el detalle real que ingresó el usuario)
  if (!issue.errorType || issue.errorType === "") {
    // sin selección: no agregamos línea
  } else if (issue.errorType === "none") {
    lines.push(`No active Outages / No errors on NC`);
  } else if (issue.errorType === "outage") {
    const base = `ACTIVE OUTAGE AFFECTING SERVICES`;
    if (issue.errorDetails && issue.errorDetails.trim()) {
      lines.push(`${base}, ${issue.errorDetails.trim()}`);
    } else {
      lines.push(base);
    }
  } else if (issue.errorType === "ncError") {
    const base = `ERROR FOUND IN NETCRACKER`;
    if (issue.errorDetails && issue.errorDetails.trim()) {
      lines.push(`${base}, ${issue.errorDetails.trim()}`);
    } else {
      lines.push(base);
    }
  }

  // SERVICE & CONNECTION en la misma línea
  if (issue.service) {
    let svcLine = `SERVICE: ${issue.service}`;
    if (issue.technology) {
      svcLine += `, CONNECTION: ${issue.technology}`;
    }
    lines.push(svcLine);
  }

  if (issue.workflow) lines.push(`WORKFLOW: ${issue.workflow}`);

  // --- AFFECTED (derivado de issue.affected + issue.service) ---
  // En el store solo existe "affected": cuando el servicio es HomePhone/Telus Email/MyTelus es obligatorio.
  const affectedVal = (issue.affected || "").trim();
  if (affectedVal) {
    if (issue.service === "HomePhone") {
      lines.push(`AFFECTED PHONE: ${affectedVal}`);
    } else if (issue.service === "Telus Email") {
      lines.push(`AFFECTED EMAIL: ${affectedVal}`);
    } else if (issue.service === "MyTelus") {
      lines.push(`MY TELUS EMAIL: ${affectedVal}`);
    }
  }

  if (issue.equipSummary)     lines.push(`CHECKPHYSICAL: ${issue.equipSummary}`);
  if (issue.troubleshooting)  lines.push(`TS STEPS: ${issue.troubleshooting}`);

  // — AWA & DIAGNOSTICS —
  if (alerts.length)          lines.push(`AWA ALERTS: ${alerts.join(", ")}`);
  if (issue.awaSteps)         lines.push(`AWA STEPS: ${issue.awaSteps}`);

  // SPEEDTESTS solo si hay down o up
  const spTests = Array.isArray(issue.spTests) ? issue.spTests : [];
  const filledTests = spTests.filter((t) => (t?.down || t?.up));
  if (filledTests.length) {
    const repr = filledTests
      .map(
        (t) =>
          `${t.down || "-"}Mbps / ${t.up || "-"}Mbps ${t.wired ? "Wired" : "Wireless"}`
      )
      .join(" ; ");
    lines.push(`SPEEDTESTS: ${repr}`);
  }

  if (issue.devicesActive || issue.devicesTotal) {
    lines.push(
      `ACTIVE/TOTAL DEVICES: ${issue.devicesActive || 0} / ${issue.devicesTotal || 0}`
    );
  }

  if (issue.tvsUsed) {
    let tvsLine = `TVS: ${issue.tvsUsed}`;
    if (issue.tvsKey) tvsLine += `, ${issue.tvsKey}`;
    lines.push(tvsLine);
  }

  // — RESOLUTION —
  if (resolution.outcome) lines.push(`RESOLVED: ${resolution.outcome}`);

  if (resolution.outcome === "No | BOSR Created" && resolution.ticketSpecial) {
    lines.push(`BOSR TICKET: ${resolution.ticketSpecial}`);
  }
  if (resolution.outcome === "No | NC Ticket Created" && resolution.ticketSpecial) {
    lines.push(`NC TICKET: ${resolution.ticketSpecial}`);
  }

  // ** AOC SIEMPRE aparece si está poblado **
  if (resolution.techAoc) {
    lines.push(`AOC: ${resolution.techAoc}`);
  }

  if (resolution.techCbr) {
    lines.push(`CBR2: ${resolution.techCbr}`);
  }

  // Agenda (DISPATCH vs FOLLOW UP) — usar SIEMPRE techDate/techTime y etiquetar según outcome
  const hasDateTime = Boolean(resolution.techDate && resolution.techTime);
  if (hasDateTime) {
    const isFollowUp =
      resolution.outcome === "No | Follow Up Required" ||
      resolution.outcome === "No | Follow Up Required | Set SCB with FVA";
    const isTech = resolution.outcome === "No | Tech Booked";

    if (isFollowUp) {
      lines.push(`FOLLOW UP: ${resolution.techDate} - ${resolution.techTime}`);
    } else if (isTech) {
      lines.push(`DISPATCH: ${resolution.techDate} - ${resolution.techTime}`);
    }
    // Si el outcome no coincide con ninguno, no agregamos línea para evitar duplicados/ambigüedad.
  }

  if (resolution.transferDept) {
    lines.push(`TRANSFER TO ${resolution.transferDept}`);
  }

  if (
    resolution.outcome === "Cx ask for a Manager | Unable to de escalate | Escalate to EMT" &&
    resolution.ticketSpecial
  ) {
    lines.push(`EMT TICKET: ${resolution.ticketSpecial}`);
  }

  if (resolution.csrOrder) {
    lines.push(`CSR ORDER: ${resolution.csrOrder}`);
  }

  if (resolution.ticketFinal) {
    lines.push(`TICKET: ${resolution.ticketFinal}`);
  }

  return lines.join("\n");
}
