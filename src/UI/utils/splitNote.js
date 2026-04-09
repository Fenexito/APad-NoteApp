// src/ui/utils/splitnote.js
// NOTE SPLITTER (999 chars)
//
// New business rules (Jan 2026):
// - Only split when the final note exceeds 999 characters.
// - Prefer splitting by sections using the anchors:
//   - "TS STEPS:" (Section 2 field)
//   - "RESOLVED:" (Section 4 start)
//
// 2-part split (default):
//   1/2: Section 1 + Section 2 (excluding TS STEPS) + Section 3
//   2/2: TS STEPS + Section 4
// If BOTH parts still exceed 999, use 3-part split:
//   1/3: Section 1 + Section 2 (excluding TS STEPS)
//   2/3: TS STEPS only
//   3/3: Section 3 + Section 4
//
// If anchors are missing/unparseable, we fall back to a simple labeled chunk split.

const MAX_DEFAULT = 999;

function trimStartNewlines(s) {
  return String(s || "").replace(/^\n+/, "");
}

function trimEndNewlines(s) {
  return String(s || "").replace(/\n+$/, "");
}

function joinBlocks(a, b) {
  const A = String(a || "");
  const B = String(b || "");
  if (!A) return B;
  if (!B) return A;
  return `${trimEndNewlines(A)}\n${trimStartNewlines(B)}`;
}

function addLabel(text, label) {
  return `${label}\n${text ?? ""}`;
}

function findLineStartIndex(text, re) {
  // Returns the index where the matching line begins, or -1.
  const m = re.exec(text);
  return m ? m.index : -1;
}

function sliceLine(text, startIdx) {
  if (startIdx < 0) return "";
  const endIdx = text.indexOf("\n", startIdx);
  if (endIdx === -1) return text.slice(startIdx);
  return text.slice(startIdx, endIdx);
}

function sliceAfterLine(text, startIdx) {
  if (startIdx < 0) return "";
  const endIdx = text.indexOf("\n", startIdx);
  if (endIdx === -1) return "";
  return text.slice(endIdx + 1);
}

export function simpleSplitWithLabels(text, maxLen = MAX_DEFAULT) {
  const src = String(text ?? "");
  if (!src) return [""];
  if (src.length <= maxLen) return [src];

  const chunks = [];
  let idx = 0;
  while (idx < src.length) {
    const partNum = chunks.length + 1;
    const label = `${partNum} / X`;
    const budget = maxLen - (label.length + 1); // +1 for \n
    chunks.push(src.slice(idx, idx + Math.max(0, budget)));
    idx += Math.max(1, budget);
  }
  const total = chunks.length;
  return chunks.map((t, i) => `${i + 1} / ${total}\n${t}`);
}

// -----------------------------
// FIELD PARSER (robust)
// -----------------------------
// The note is produced by noteBuilder.js and can contain multiline field values.
// Any line that does NOT start a known field label is treated as a continuation
// of the previous field (critical for TS STEPS and AWA STEPS).

function normalizeLines(note) {
  return String(note ?? "").split(/\r?\n/);
}

// Known field starters based on src/ui/utils/noteBuilder.js output.
// IMPORTANT: order matters (more specific first).
const FIELD_STARTERS = [
  // Section 4 (resolution)
  { key: "RESOLVED", re: /^RESOLVED\s*:/i, sec: 4 },
  { key: "BOSR_TICKET", re: /^BOSR\s+TICKET\s*:/i, sec: 4 },
  { key: "NC_TICKET", re: /^NC\s+TICKET\s*:/i, sec: 4 },
  { key: "AOPC", re: /^AOPC\s*:/i, sec: 4 },
  { key: "CBR2", re: /^CBR2\s*:/i, sec: 4 },
  { key: "FOLLOW_UP", re: /^FOLLOW\s+UP\s*:/i, sec: 4 },
  { key: "DISPATCH", re: /^DISPATCH\s*:/i, sec: 4 },
  { key: "EMT_TICKET", re: /^EMT\s+TICKET\s*:/i, sec: 4 },
  { key: "CSR_ORDER", re: /^CSR\s+ORDER\s*:/i, sec: 4 },
  { key: "TICKET", re: /^TICKET\s*:/i, sec: 4 },
  { key: "TRANSFER_TO", re: /^TRANSFER\s+TO\b/i, sec: 4 }, // no colon

  // Section 3 (AWA/Diagnostics)
  { key: "AWA_ALERTS", re: /^AWA\s+ALERTS\s*:/i, sec: 3 },
  { key: "AWA_STEPS", re: /^AWA\s+STEPS\s*:/i, sec: 3 },
  { key: "SPEEDTESTS", re: /^SPEEDTESTS\s*:/i, sec: 3 },
  { key: "ACTIVE_TOTAL_DEVICES", re: /^ACTIVE\/TOTAL\s+DEVICES\s*:/i, sec: 3 },
  { key: "TVS", re: /^TVS\s*:/i, sec: 3 },

  // Section 2 (Issue/Troubleshoot)
  { key: "CX_ISSUE", re: /^CX\s+ISSUE\s*:/i, sec: 2 },
  { key: "SERVICE_ON_CSR", re: /^SERVICE\s+ON\s+CSR\s*:/i, sec: 2 },
  { key: "SERVICE", re: /^SERVICE\s*:/i, sec: 2 },
  { key: "WORKFLOW", re: /^WORKFLOW\s*:/i, sec: 2 },
  { key: "AFFECTED_PHONE", re: /^AFFECTED\s+PHONE\s*:/i, sec: 2 },
  { key: "AFFECTED_EMAIL", re: /^AFFECTED\s+EMAIL\s*:/i, sec: 2 },
  { key: "MY_TELUS_EMAIL", re: /^MY\s+TELUS\s+EMAIL\s*:/i, sec: 2 },
  { key: "CHECKPHYSICAL", re: /^CHECKPHYSICAL\s*:/i, sec: 2 },
  { key: "TS_STEPS", re: /^TS\s+STEPS\s*:/i, sec: 2 }, // may be multiline
  // Non-colon status lines in section 2
  { key: "NO_OUTAGES", re: /^No\s+active\s+Outages\b/i, sec: 2 },
  { key: "ACTIVE_OUTAGE", re: /^ACTIVE\s+OUTAGE\b/i, sec: 2 },
  { key: "NC_ERROR", re: /^ERROR\s+FOUND\s+IN\s+NETCRACKER\b/i, sec: 2 },

  // Section 1 (Agent/Customer)
  { key: "AGENT", re: /^PFTS\s*\|/i, sec: 1 },
  { key: "BAN", re: /^BAN\s*:/i, sec: 1 },
  { key: "CID", re: /^CID\s*:/i, sec: 1 },
  { key: "NAME", re: /^NAME\s*:/i, sec: 1 },
  { key: "CBR", re: /^CBR\s*:/i, sec: 1 },
  { key: "CALLER", re: /^CALLER\s*:/i, sec: 1 },
  { key: "VERIFIED_BY", re: /^VERIFIED\s+BY\s*:/i, sec: 1 },
  { key: "ADDRESS", re: /^ADDRESS\s*:/i, sec: 1 },
  { key: "XID", re: /^XID\s*:/i, sec: 1 },
  { key: "PHONE", re: /^PHONE\s*:/i, sec: 1 },
  { key: "ACCOUNT_ID", re: /^ACCOUNT\s+ID\s*:/i, sec: 1 },
];

function detectStarter(line) {
  const s = (line ?? "").trim();
  if (!s) return null;
  for (const st of FIELD_STARTERS) {
    if (st.re.test(s)) return st;
  }
  return null;
}

function parseFields(note) {
  const lines = normalizeLines(note);
  /** @type {{key:string, sec:number, text:string}[]} */
  const blocks = [];

  let current = null; // {key, sec, lines[]}

  const flush = () => {
    if (!current) return;
    blocks.push({
      key: current.key,
      sec: current.sec,
      text: current.lines.join("\n"),
    });
    current = null;
  };

  for (const line of lines) {
    const starter = detectStarter(line);
    if (starter) {
      flush();
      current = { key: starter.key, sec: starter.sec, lines: [line] };
    } else {
      // Continuation: attach to previous field if exists, otherwise keep as anonymous section 2 text.
      if (!current) {
        current = { key: "UNKNOWN", sec: 2, lines: [line] };
      } else {
        current.lines.push(line);
      }
    }
  }
  flush();
  return blocks;
}

function buildByFilter(blocks, fn) {
  return blocks.filter(fn).map((b) => b.text).join("\n");
}

/**
 * Split a final note into labeled parts, each <= 999 chars.
 */
export function splitNoteFinal(noteText, maxLen = MAX_DEFAULT) {
  const note = String(noteText ?? "");
  if (!note) return [""];
  if (note.length <= maxLen) return [note];

  const blocks = parseFields(note);
  const hasTS = blocks.some((b) => b.key === "TS_STEPS");
  if (!hasTS) return simpleSplitWithLabels(note, maxLen);

  // Build canonical section groupings based on YOUR app structure:
  // Section 1: sec === 1
  // Section 2: sec === 2 (but TS_STEPS handled separately)
  // Section 3: sec === 3
  // Section 4: sec === 4
  const sec1 = buildByFilter(blocks, (b) => b.sec === 1);
  const sec2_noTS = buildByFilter(blocks, (b) => b.sec === 2 && b.key !== "TS_STEPS");
  const tsSteps = buildByFilter(blocks, (b) => b.key === "TS_STEPS"); // includes multiline value
  const sec3 = buildByFilter(blocks, (b) => b.sec === 3);
  const sec4 = buildByFilter(blocks, (b) => b.sec === 4);

  const sec12_noTS = joinBlocks(sec1, sec2_noTS);
  // --- Attempt 2-part split (default) ---
  // Note 1: Section 1 + Section 2 (excluding TS) + Section 3
  const note1_2_raw = joinBlocks(sec12_noTS, sec3);
  // Note 2: TS + Section 4
  const note2_2_raw = joinBlocks(tsSteps, sec4);

  const note1_2 = addLabel(note1_2_raw, "1 / 2");
  const note2_2 = addLabel(note2_2_raw, "2 / 2");

  const n1TooBig = note1_2.length > maxLen;
  const n2TooBig = note2_2.length > maxLen;

  // If both fit, we're done.
  if (!n1TooBig && !n2TooBig) return [note1_2, note2_2];

  // --- 3-part split (IMMEDIATELY when ANY 2-part note exceeds 999) ---
  // Your strict rule:
  // Note 1: Section 1 + everything from Section 2 except TS STEPS
  // Note 2: TS STEPS only
  // Note 3: Section 3 + Section 4
  const note1_3_raw = trimEndNewlines(sec12_noTS);
  const note2_3_raw = trimEndNewlines(tsSteps);
  const note3_3_raw = joinBlocks(sec3, sec4);

  const note1_3 = addLabel(note1_3_raw, "1 / 3");
  const note2_3 = addLabel(note2_3_raw, "2 / 3");
  const note3_3 = addLabel(note3_3_raw, "3 / 3");

  // Guarantee compliance in extreme cases.
  if (note1_3.length > maxLen || note2_3.length > maxLen || note3_3.length > maxLen) {
    return simpleSplitWithLabels(note, maxLen);
  }
  return [note1_3, note2_3, note3_3];
}