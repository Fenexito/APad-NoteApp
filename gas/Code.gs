/*********************************
 * APAD | NOTEAPP - Google Apps Script (FULL, SIN DRIVE) con Copilot filtrado
 * Timezone: America/Guatemala
 **********************************/

/** ====== CONFIG (UI Access) ====== **/
const ALLOWLIST = [
  "menfil.tovarvanhoutven@telus.com",
  "alex.vanhoutven.g38@gmail.com",
];

const TIMEZONE = 'America/Guatemala';

/** ====== CONFIG (Supabase + DEV) ====== **/
// Configura en Propiedades del Script (Proyecto → engranaje):
// SUPABASE_URL = https://xxxx.supabase.co
// SUPABASE_SERVICE_KEY = (service_role key)
// DEV_MODE = 1  (habilita ?devEmail= y CORS localhost)
// DEV_ALLOW_ORIGIN = http://localhost:5173
function CFG_() {
  const p = PropertiesService.getScriptProperties();
  return {
    SB_URL: p.getProperty('SUPABASE_URL') || '',
    SB_KEY: p.getProperty('SUPABASE_SERVICE_KEY') || '',
    DEV_MODE: (p.getProperty('DEV_MODE') || '0') === '1',
    DEV_ALLOW_ORIGIN: p.getProperty('DEV_ALLOW_ORIGIN') || 'http://localhost:5173',
  };
}

/** ====== Helpers ====== **/
function retry_(fn, tries=4, label='retry_') {
  let lastErr;
  for (let i=1;i<=tries;i++){
    try { return fn(); }
    catch(e){ lastErr=e; console.warn(`[${label}] FAIL (try ${i}/${tries}): ${e && e.message}`); Utilities.sleep(300*i); }
  }
  throw lastErr;
}

function toIsoGuate_(input){
  const d = input ? new Date(input) : new Date();
  const base = Utilities.formatDate(d, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
  return base + "-06:00"; // GT sin DST
}

function safeJson_(v){
  if (v==null) return '';
  if (typeof v==='string'){ try{ JSON.parse(v); }catch(_){} return v; }
  try { return JSON.stringify(v); } catch { return String(v); }
}

function getDeep_(obj, path){
  try { return path.split('.').reduce((o,k)=> (o && o[k]!==undefined ? o[k] : null), obj); }
  catch { return null; }
}

function arrToStr_(v){
  if (v==null) return '';
  if (Array.isArray(v)){
    if (v.every(x=>typeof x==='string')) return v.join(' | ');
    return v.map(x => (typeof x==='string' ? x : (x && x.name) || JSON.stringify(x))).join(' | ');
  }
  return String(v);
}

/** ====== LEGACY TEXT PARSER ====== **/
const LEGACY_LABELS = [
  'SKILL','BAN','CID','NAME','CBR','CALLER','VERIFIED BY','SERVICE ON CSR',
  'OUTAGE','NC','SUSPENDED','SERVICE','WORKFLOW','CX ISSUE','CHECK PHYSICAL','CHECKPHYSICAL',
  'TS STEPS','ADC TROUBLE CONDITIONS','ADC TROUBLE CONDITIONS 3','AWA ALERTS','AWA STEPS',
  'TVS','EXTRA STEPS','RESOLVED','FOLLOW UP','DISPATCH','CSR ORDER','TICKET',
  'ADDRESS','ADDITIONAL INFO','XID','CONNECTION','SPEEDTESTS','ACTIVE/TOTAL DEVICES','AOC','CBR2'
];

function parseLegacyTextMap_(text){
  const map = {};
  if (!text) return map;
  const lines = String(text).split(/\r?\n/);
  const re = new RegExp(`^(${LEGACY_LABELS.join('|')})\\s*:\\s*(.*)$`,'i');
  let cur=null;
  for (const raw of lines){
    const line = raw.replace(/\s+$/,'');
    const m = line.match(re);
    if (m){ cur={label:m[1].toUpperCase()}; map[cur.label]=m[2]||''; continue; }
    if (cur) map[cur.label] += (map[cur.label] ? '\n' : '') + line;
  }
  return map;
}

function parseTVS_(tvsLine){
  if (!tvsLine) return {tvs:'',tvs_key:''};
  const txt = tvsLine.trim();
  if (/^\s*YES\b/i.test(txt)){
    let key = txt.replace(/^\s*YES\s*[,:\-]?\s*/i,'').trim();
    if (/^not needed/i.test(key) || /^offered/i.test(key)) key='';
    return {tvs:'YES', tvs_key:key};
  }
  if (/^\s*NO\b/i.test(txt) || /Not needed/i.test(txt)) return {tvs:'NO', tvs_key:''};
  return {tvs:txt, tvs_key:''};
}

function lastSegmentAsConnection_(checkPhysical){
  if (!checkPhysical) return '';
  const segs = checkPhysical.split(',').map(s=>s.trim()).filter(Boolean);
  return segs.length ? segs[segs.length-1] : '';
}

function parseDispatch_(dispatchLine, fallbackTs){
  if (!dispatchLine) return {date:'', time:''};
  const txt = dispatchLine.replace(/\s+/g,' ').trim();

  const mIso = txt.match(/(\d{4}-\d{2}-\d{2}).*?(\d{1,2}:\d{2}\s*(?:am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
  if (mIso) return {date:mIso[1], time:mIso[2]};

  const mText = txt.match(/^[A-Za-z]{3,}\s+[A-Za-z]{3,}\s+\d{1,2},\s*(.+)$/);
  if (mText) return {date:'', time:(mText[1]||'').replace(/\s*AOC.*$/i,'').trim()};

  const dateSolo = (txt.match(/(\d{4}-\d{2}-\d{2})/)||[,''])[1];
  const timeSolo = (txt.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm)?)/i)||[,''])[1];
  return {date:dateSolo, time:timeSolo||''};
}

function normalizeServiceConnection_(service, connectionExisting){
  if (!service) return {service:'', connection:(connectionExisting||'')};
  let svc = String(service).trim();
  let conn = connectionExisting ? String(connectionExisting).trim() : '';

  const hasConn = svc.match(/(?:^|[,|])\s*CONNECTION\s*:\s*([^,|]+)/i);
  if (hasConn){
    if (!conn) conn = hasConn[1].trim();
    svc = svc.replace(/[,|]?\s*CONNECTION\s*:\s*[^,|]+/ig,'').trim();
    svc = svc.replace(/[,\|]\s*$/,'').trim();
  }
  return {service:svc, connection:conn};
}

function splitCompositeDispatch_(dispatch_date, dispatch_time){
  let d = dispatch_date || '';
  let t = dispatch_time || '';
  const txt = (d ? (d + ' ' + t) : t) || '';
  if (!txt) return {date:d, time:t};

  const mIso = txt.match(/(\d{4}-\d{2}-\d{2}).*?(\d{1,2}:\d{2}\s*(?:am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
  if (mIso) return {date:mIso[1], time:mIso[2]};

  const dateSolo = (txt.match(/(\d{4}-\d{2}-\d{2})/)||[,''])[1];
  const timeSolo = (txt.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm)?)/i)||[,''])[1];
  if (dateSolo || timeSolo) return {date:dateSolo||d, time:timeSolo||t};
  return {date:d, time:t};
}

function buildFinalNote_(f){
  const out = [];
  const push = (k,v)=>{ if (v) out.push(`${k}: ${v}`); };
  push('BAN', f.ban); push('CID', f.cid); push('NAME', f.name);
  push('SERVICE', f.service + (f.connection ? `, CONNECTION: ${f.connection}` : ''));
  push('WORKFLOW', f.workflow);
  push('CX ISSUE', f.cx_issue); push('CHECKPHYSICAL', f.check_physical);
  push('TS STEPS', f.ts_steps);
  if (f.awa_alerts) push('AWA ALERTS', f.awa_alerts);
  if (f.awa_steps)  push('AWA STEPS', f.awa_steps);
  if (f.tvs)        push('TVS', f.tvs + (f.tvs_key ? `, ${f.tvs_key}` : ''));
  push('RESOLVED', f.status);
  if (f.dispatch_date || f.dispatch_time) push('DISPATCH', [f.dispatch_date, f.dispatch_time].filter(Boolean).join(' | '));
  if (f.csr_order) push('CSR ORDER', f.csr_order);
  if (f.ticket)    push('TICKET', f.ticket);
  if (f.cbr)       push('CBR', f.cbr);
  return out.join('\n');
}

/** === Copilot builder (excluye PII) === */
function buildCopilotFromNote_(rawText){
  if (!rawText) return '';
  const linesAll = String(rawText).split(/\r?\n/);

  const startIdx = linesAll.findIndex(l => /^\s*CX ISSUE\s*:/.test(l.toUpperCase()));
  const lines = startIdx >= 0 ? linesAll.slice(startIdx) : linesAll;

  const exclude = [
    /^BAN\s*:/i,
    /^CID\s*:/i,
    /^NAME\s*:/i,
    /^CBR\s*:/i,
    /^CALLER\s*:/i,
    /^VERIFIED BY\s*:/i,
    /^ADDRESS\s*:/i,
    /^XID\s*:/i,
    /^AFFECTED\s+(HOME\s+)?PHONE\s*:/i,
    /^AFFECTED\s+EMAIL(\s+ADDRESS)?\s*:/i,
    /^MY\s*TELUS\s*EMAIL\s*:/i,
    /^CBR2\s*:/i
  ];

  const kept = lines.filter(l => !exclude.some(rx => rx.test(l)));
  const compressed = [];
  for (const l of kept){
    const s = l.replace(/\s+$/,'');
    if (s === '' && (compressed.length===0 || compressed[compressed.length-1]==='')) continue;
    compressed.push(s);
  }
  return compressed.join('\n').trim();
}

/** ====== NORMALIZADOR ====== **/
function parseEventToFields_(ev, agentName){
  const out = {};
  const payload = (() => {
    const p = ev && ev.payload_json;
    if (!p) return null;
    if (typeof p === 'string'){ try { return JSON.parse(p); } catch { return null; } }
    if (typeof p === 'object') return p;
    return null;
  })();

  const ts = ev.timestamp || ev.createdAt || ev.created || (payload && (payload.timestamp || payload.createdAt)) || null;
  out.timestamp_iso = toIsoGuate_(ts);

  out.uuid     = (ev.uuid || ev.id || Utilities.getUuid()) + '';
  out.note_id  = (ev.note_id || ev.id || '') + '';
  out.agent_id = (ev.agent_id || agentName || '') + '';

  let tags = ev.tags;
  if (Array.isArray(tags)) out.tags = tags.join('|');
  else if (typeof tags === 'string') out.tags = tags;
  else out.tags = '';

  out.payload_json = safeJson_(ev.payload_json || payload || {});
  out.app_version  = (ev.app_version || (payload && (payload.app_version || payload.version)) || '') + '';

  const take = (k,...alts)=>{
    if (ev && ev[k]!=null && ev[k]!=='') return ev[k];
    if (payload && payload[k]!=null && payload[k]!=='') return payload[k];
    for (const a of alts){
      if (payload && payload[a]!=null && payload[a]!=='') return payload[a];
      if (ev && ev[a]!=null && ev[a]!=='') return ev[a];
    }
    return '';
  };
  const takeDeep = (...paths)=> {
    for (const p of paths){
      const v = getDeep_(payload,p);
      if (v!=null && v!=='') return v;
    }
    return '';
  };

  out.ban        = take('ban');
  out.cid        = take('cid');
  out.cbr        = take('cbr','phone');
  out.name       = take('name');
  out.service    = take('service');
  out.connection = take('connection');
  out.workflow   = take('workflow');
  out.cx_issue   = take('cx_issue','issue');
  out.check_physical = take('check_physical');
  out.ts_steps   = take('ts_steps','steps');
  out.awa_alerts = take('awa_alerts');
  out.awa_steps  = take('awa_steps');
  out.tvs        = take('tvs');
  out.tvs_key    = take('tvs_key');
  out.status     = take('status','resolved');
  out.dispatch_date = take('dispatch_date');
  out.dispatch_time = take('dispatch_time');
  out.bosr_nc    = take('bosr_nc','nc');
  out.csr_order  = take('csr_order');
  out.ticket     = take('ticket');

  out.copilot_input =
    take('copilot_input','copilotInput') ||
    takeDeep('copilot.input','data.copilot.input','ui.copilotInput','data.ui.copilotInput') ||
    '';
  let copilotUsedRaw =
    take('copilot_used','copilotUsed') ||
    takeDeep('copilot.used','data.copilot.used','ui.copilotUsed','data.ui.copilotUsed','assistant.used','ai.used') ||
    '';

  out.service    = out.service    || takeDeep('data.issue.service');
  out.workflow   = out.workflow   || takeDeep('data.issue.workflow');
  out.cx_issue   = out.cx_issue   || takeDeep('data.issue.cxIssue');
  out.ts_steps   = out.ts_steps   || takeDeep('data.issue.troubleshooting','data.problem.steps');
  out.awa_steps  = out.awa_steps  || takeDeep('data.issue.awaSteps');

  if (!out.awa_alerts){
    const al = takeDeep('data.alerts','data.issue.awaAlerts');
    out.awa_alerts = arrToStr_(al);
  }

  if (!out.tvs){
    const used = String(takeDeep('data.issue.tvsUsed')||'').toLowerCase();
    out.tvs = used ? (/^yes|true|1/.test(used)?'YES':(/^no|false|0|not needed/.test(used)?'NO':used)) : '';
  }
  out.tvs_key = out.tvs_key || String(takeDeep('data.issue.tvsKey')||'');

  out.connection = out.connection || String(takeDeep('data.issue.technology') || '');
  if (!out.connection){
    const conns = takeDeep('data.problem.connections');
    if (conns && conns.length) out.connection = String(conns[0]);
  }

  out.status = out.status || String(takeDeep('resolution.outcome','data.resolution.outcome') || '');

  out.dispatch_date = out.dispatch_date || String(takeDeep('resolution.techDate','data.resolution.techDate') || '');
  out.dispatch_time = out.dispatch_time || String(takeDeep('resolution.techTime','data.resolution.techTime') || '');

  out.csr_order = out.csr_order || String(takeDeep('resolution.csrOrder','data.resolution.csrOrder') || '');
  out.ticket    = out.ticket    || String(takeDeep('resolution.ticketFinal','data.resolution.ticketFinal') || '');

  const txt = (ev.text || (ev && ev.text) || '');

  if (txt){
    const m = parseLegacyTextMap_(txt);
    out.ban   = out.ban   || m['BAN'] || '';
    out.cid   = out.cid   || m['CID'] || '';
    out.cbr   = out.cbr   || m['CBR'] || m['CBR2'] || '';
    out.name  = out.name  || m['NAME'] || '';
    out.service  = out.service  || m['SERVICE'] || '';
    out.workflow = out.workflow || m['WORKFLOW'] || '';
    out.cx_issue = out.cx_issue || m['CX ISSUE'] || '';
    out.check_physical = out.check_physical || m['CHECK PHYSICAL'] || m['CHECKPHYSICAL'] || '';
    out.ts_steps = out.ts_steps || m['TS STEPS'] || '';
    out.awa_alerts = out.awa_alerts || m['AWA ALERTS'] || '';
    out.awa_steps  = out.awa_steps  || m['AWA STEPS'] || '';

    if (!out.tvs){
      const tvsParsed = parseTVS_(m['TVS'] || '');
      out.tvs = tvsParsed.tvs;
      out.tvs_key = out.tvs_key || tvsParsed.tvs_key;
    }
    out.status = out.status || (m['RESOLVED'] || '');

    if (!out.bosr_nc) {
      out.bosr_nc = m['NC'] || m['OUTAGE'] || '';
    }

    if (!out.csr_order) {
      const co = (m['CSR ORDER'] || '').match(/\d+/g);
      out.csr_order = co ? co.join('') : '';
    }
    out.ticket = out.ticket || (m['TICKET'] || '');

    if (!out.connection){
      out.connection = m['CONNECTION'] || lastSegmentAsConnection_(out.check_physical);
    }

    if (!out.dispatch_date && !out.dispatch_time) {
      const parsed = parseDispatch_(m['DISPATCH'] || '', ts);
      out.dispatch_date = parsed.date || '';
      out.dispatch_time = parsed.time || '';
    }
  }

  const svcNorm = normalizeServiceConnection_(out.service, out.connection);
  out.service = svcNorm.service;
  out.connection = svcNorm.connection || out.connection || lastSegmentAsConnection_(out.check_physical);

  const dtNorm = splitCompositeDispatch_(out.dispatch_date, out.dispatch_time);
  out.dispatch_date = dtNorm.date;
  out.dispatch_time = dtNorm.time;

  out.final_note =
    (ev.final_note || '') ||
    (txt ? String(txt) : buildFinalNote_(out));

  if (!out.copilot_input){
    const source = txt || out.final_note || '';
    out.copilot_input = buildCopilotFromNote_(source);
  }
  if (String(out.copilot_input || '').trim()){
    out.copilot_used = 'YES';
  } else {
    let copilotUsedRaw = '';
    const s = String(copilotUsedRaw).trim().toLowerCase();
    out.copilot_used = (s==='true'||s==='yes'||s==='1')?'YES':(s==='false'||s==='no'||s==='0')?'NO':'';
  }

  for (const k of Object.keys(out)){
    if (out[k]==null) out[k]='';
    out[k]=String(out[k]);
  }
  return out;
}

/** ====== UI Helpers ====== **/
function _blockHtml(msg){
  return `
  <html>
    <head>
      <meta charset="utf-8">
      <title>APAD | Acceso</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#f6f7fb;margin:0;display:flex;height:100vh;align-items:center;justify-content:center}
        .card{background:#fff;padding:28px;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.1);text-align:center;width:min(520px,92vw)}
        h2{margin:0 0 10px;color:#202124}
        p{margin:8px 0 0;color:#5f6368}
      </style>
    </head>
    <body>
      <div class="card">
        <h2>APAD | NoteApp</h2>
        <p>${msg}</p>
      </div>
    </body>
  </html>`;
}

function text_(s) {
  return ContentService.createTextOutput(s)
    .setMimeType(ContentService.MimeType.TEXT);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function envInfo_(){
  const { SB_URL, SB_KEY, DEV_MODE, DEV_ALLOW_ORIGIN } = CFG_();
  const email = getActiveEmail_();
  return {
    ts: new Date().toISOString(),
    SB_URL_present: !!SB_URL,
    SB_KEY_present: !!SB_KEY,
    SB_URL_value: SB_URL || '',
    DEV_MODE,
    DEV_ALLOW_ORIGIN,
    activeUserEmail: email || '',
    note: 'Usa SIEMPRE la URL de "Administrar despliegues".'
  };
}

function getActiveEmail_(){
  try { return (Session.getActiveUser().getEmail() || '').toLowerCase().trim(); }
  catch { return ''; }
}

// Email efectivo: sesión corporativa; en DEV (si está habilitado) permite override por ?devEmail=
function resolveEmail_(e){
  const sess = getActiveEmail_();
  const { DEV_MODE } = CFG_();
  const devEmail = e && e.parameter && e.parameter.devEmail
    ? String(e.parameter.devEmail).toLowerCase().trim()
    : '';
  if (DEV_MODE && devEmail && /@/.test(devEmail)) return devEmail;
  return sess;
}

/** ====== Supabase REST helpers ====== **/
function sbHeaders_(extra){
  const { SB_KEY } = CFG_();
  if (!SB_KEY) throw new Error('Supabase: falta SUPABASE_SERVICE_KEY en Script Properties.');
  return Object.assign({
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
    'Content-Type': 'application/json'
  }, extra || {});
}
function sbGet_(path){
  const { SB_URL } = CFG_();
  if (!SB_URL) throw new Error('Supabase: falta SUPABASE_URL en Script Properties.');
  const res = UrlFetchApp.fetch(SB_URL + path, {
    method: 'get',
    headers: sbHeaders_(),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code >= 400) {
    const body = res.getContentText();
    console.error('[Supabase GET error]', { path, code, body });
    // Propagamos el cuerpo para verlo en el frontend (y evitar 500 "mudo")
    throw new Error(`GET ${path} -> ${code} :: ${body}`);
  }
  return JSON.parse(res.getContentText() || '[]');
}
function sbPost_(path, payload, prefer){
  const { SB_URL } = CFG_();
  if (!SB_URL) throw new Error('Supabase: falta SUPABASE_URL en Script Properties.');
  // prefer por default: return=minimal para upserts
  const res = UrlFetchApp.fetch(SB_URL + path, {
    method: 'post',
    headers: sbHeaders_({'Prefer': prefer || 'return=minimal'}),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code >= 400) throw new Error(`POST ${path} -> ${code} ${res.getContentText()}`);
  return res;
}

/** ====== Endpoints: NOTES ====== **/
// Inserta/actualiza lote en notes (normaliza cada evento)
function sb_appendNotesBatch_(agentName, events){
  if (!agentName) throw new Error('agentName requerido');
  if (!Array.isArray(events) || events.length===0) return { appended: 0 };

  const out = [];
  const seen = new Set();

  for (const ev of events){
    if (!ev) continue;
    const uid = String(ev.uuid || ev.note_id || ev.id || '').trim();
    if (uid && seen.has(uid)) continue;
    if (uid) seen.add(uid);

    const f = parseEventToFields_(ev, agentName);

    const rec = {
      external_id: (ev.id || ev.uuid || ev.note_id || f.note_id || f.uuid || ('gen-' + Utilities.getUuid())) + '',
      agent_id: f.agent_id || agentName || 'unknown',
      timestamp_iso: f.timestamp_iso || toIsoGuate_(null),

      uuid: f.uuid || '',
      note_id: f.note_id || '',
      tags: f.tags || '',
      payload_json: (()=>{ try { return f.payload_json ? JSON.parse(f.payload_json) : null; } catch { return null; } })(),
      app_version: f.app_version || '',

      ban: f.ban || '',
      cid: f.cid || '',
      cbr: f.cbr || '',
      name: f.name || '',
      service: f.service || '',
      connection: f.connection || '',
      workflow: f.workflow || '',
      cx_issue: f.cx_issue || '',
      check_physical: f.check_physical || '',
      ts_steps: f.ts_steps || '',
      awa_alerts: f.awa_alerts || '',
      awa_steps: f.awa_steps || '',
      tvs: f.tvs || '',
      tvs_key: f.tvs_key || '',
      status: f.status || '',
      dispatch_date: f.dispatch_date || null,
      dispatch_time: f.dispatch_time || '',
      bosr_nc: f.bosr_nc || '',
      csr_order: f.csr_order || '',
      ticket: f.ticket || '',
      final_note: f.final_note || '',
      copilot_input: f.copilot_input || '',
      copilot_used: f.copilot_used || '',
      raw_text: ev.text || ''
    };
    out.push(rec);
  }

  if (!out.length) return { appended: 0 };

  // Upsert por external_id
  sbPost_('/rest/v1/notes?on_conflict=external_id', out, 'resolution=merge-duplicates,return=minimal');
  return { appended: out.length };
}

// Lee notas con filtros (sin columnas derivadas; usa rangos en timestamp_iso)
function sb_listNotes_(agentName, opts){
  const limit = Math.min(+((opts && opts.limit) || 200), 500);
  const offset = Math.max(+((opts && opts.offset) || 0), 0);
  const status = (opts && opts.status) || '';
  const month  = (opts && opts.month)  || ''; // YYYY-MM
  const day    = (opts && opts.day)    || ''; // YYYY-MM-DD
  const q      = (opts && opts.q || '').trim();

  // Helpers para rangos
  const pad2 = n => (n<10?('0'+n):''+n);
  const nextMonthRange = (ym) => {
    // ym: 'YYYY-MM' => {gte:'YYYY-MM-01T00:00:00', lt:'YYYY-MM(next)-01T00:00:00'}
    const [Y,M] = ym.split('-').map(x=>+x);
    const y = isFinite(Y)?Y:1970, m = isFinite(M)?M:1;
    const gte = `${pad2(y)}-${pad2(m)}-01T00:00:00`;
    const nm = m===12 ? 1 : (m+1);
    const ny = m===12 ? (y+1) : y;
    const lt  = `${pad2(ny)}-${pad2(nm)}-01T00:00:00`;
    return { gte, lt };
  };
  const nextDayRange = (yd) => {
    // yd: 'YYYY-MM-DD' => {gte:'YYYY-MM-DDT00:00:00', lt:'YYYY-MM-(DD+1)T00:00:00'}
    const [Y,M,D] = yd.split('-').map(x=>+x);
    const d0 = new Date(Date.UTC(Y||1970,(M||1)-1,D||1,0,0,0));
    const d1 = new Date(d0.getTime() + 24*60*60*1000);
    const gte = `${d0.getUTCFullYear()}-${pad2(d0.getUTCMonth()+1)}-${pad2(d0.getUTCDate())}T00:00:00`;
    const lt  = `${d1.getUTCFullYear()}-${pad2(d1.getUTCMonth()+1)}-${pad2(d1.getUTCDate())}T00:00:00`;
    return { gte, lt };
  };

  let params = [];
  // select sólo lo que muestra tu UI (sin month_ym, day_ymd)
  params.push('select=' + encodeURIComponent([
    'id','external_id','agent_id','timestamp_iso',
    'ban','cid','cbr','name','service','connection','workflow',
    'cx_issue','check_physical','ts_steps','awa_alerts','awa_steps',
    'tvs','tvs_key','status','dispatch_date','dispatch_time','bosr_nc',
    'csr_order','ticket','final_note','copilot_input','copilot_used',
    'tags','app_version'
  ].join(',')));

  if (agentName) params.push('agent_id=eq.' + encodeURIComponent(agentName));
  if (status)    params.push('status=eq.' + encodeURIComponent(status));

  if (q) {
    const orParts = [
      'final_note.ilike.*' + q + '*',
      'cx_issue.ilike.*' + q + '*',
      'workflow.ilike.*' + q + '*',
      'service.ilike.*' + q + '*',
      'connection.ilike.*' + q + '*',
      'tags.ilike.*' + q + '*',
      'name.ilike.*' + q + '*',
      'ban.ilike.*' + q + '*',
      'cid.ilike.*' + q + '*',
      'ticket.ilike.*' + q + '*'
    ];
    params.push('or=(' + orParts.map(encodeURIComponent).join(',') + ')');
  }

  params.push('order=timestamp_iso.desc');
  params.push('limit=' + limit);
  params.push('offset=' + offset);

  const path = '/rest/v1/notes?' + params.join('&');
  const items = sbGet_(path);
  return { total: items.length, offset, limit, month: month || '', items };
}

/** ====== Endpoints: SHORTKEYS ====== **/
function sb_getShortkey_(key){
  const arr = sbGet_('/rest/v1/shortkeys?key=eq.' + encodeURIComponent(key) + '&select=key,tags,graph_json&limit=1');
  return arr && arr[0];
}
function sb_upsertShortkey_(payload){
  // payload es el objeto completo del grafo (con key/tags dentro, si existen)
  const key = (payload && payload.key) ? String(payload.key) : 'default';
  const tags = (() => {
    if (!payload) return [];
    const t = payload.tags;
    if (Array.isArray(t)) return t.map(String);
    if (typeof t === 'string') return [t];
    return [];
  })();

  const body = [{ key, tags, graph_json: payload }];
  sbPost_('/rest/v1/shortkeys?on_conflict=key', body, 'resolution=merge-duplicates,return=minimal');
  return { upserted: 1, key };
}

/** ====== Endpoints: PREFS (agents) ====== **/
function sb_getPref_(email){
  const e = (email || '').toLowerCase().trim();
  if (!e) return { email:'', agentName:'' };
  const arr = sbGet_('/rest/v1/agents?email=eq.' + encodeURIComponent(e) + '&select=email,preferred_agent_name&limit=1');
  const row = (arr && arr[0]) || null;
  return { email: e, agentName: (row && row.preferred_agent_name) || '' };
}
function sb_setPref_(email, agentName){
  const e = (email || '').toLowerCase().trim();
  const a = String(agentName || '').trim();
  if (!e) return { ok:false, error:'email vacío' };
  sbPost_('/rest/v1/agents?on_conflict=email', [{ email: e, preferred_agent_name: a }], 'resolution=merge-duplicates,return=minimal');
  return { ok:true, email:e, agentName:a };
}

/** ====== WEB APP (UI & API Router) ====== **/
function doGet(e){
  const route = e && e.parameter && e.parameter.route;

  if (route) {
    // -------- API GET routes --------
    try {
      if (route === 'ping') return text_('pong ' + new Date().toISOString());
      if (route === 'env')  return json_({ ok: true, ...envInfo_() });

      if (route === 'notes.list') {
        // el email real lo resuelve el backend; agent es opcional (alias)
        const email = resolveEmail_(e);
        const agent = (e.parameter.agent || '').trim() || email;
        const opts = {
          month:  (e.parameter.month  || '').trim(), // YYYY-MM
          day:    (e.parameter.day    || '').trim(), // YYYY-MM-DD
          status: (e.parameter.status || '').trim(),
          q:      (e.parameter.q      || '').trim(),
          limit:  +(e.parameter.limit || 200),
          offset: +(e.parameter.offset|| 0),
        };
        const res = sb_listNotes_(agent, opts);
        return json_(res);
      }
      if (route === 'diag.supabase') {
        try {
          // prueba mínima contra tu tabla principal
          const data = sbGet_('/rest/v1/notes?select=id&limit=1');
          return json_({ ok:true, sample: data });
        } catch (err) {
          return json_({ ok:false, message: String(err && err.message || err) });
        }
      }

      if (route === 'shortkeys.get') {
        const key = (e.parameter.key || '').trim();
        if (!key) return json_({error:'key requerido'});
        const sk = sb_getShortkey_(key);
        return json_({ item: sk || null });
      }

      if (route === 'prefs.get') {
        const email = resolveEmail_(e);
        const pref = sb_getPref_(email);
        return json_(pref);
      }

      // default: 404
      return text_('Not found').setMimeType(ContentService.MimeType.TEXT);
    } catch (err) {
      console.error('[doGet route error]', err && err.stack || err);
      // respondemos 200 con JSON para que el front NO lo trate como 500
      return json_({ ok:false, route, error: String(err && err.message || err) });
    }
  }

  // -------- UI (Index) --------
  try{
    const email = getActiveEmail_();
    if (!email){
      return HtmlService.createHtmlOutput(_blockHtml("❌ No se pudo obtener tu identidad corporativa."))
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    const allowed = ALLOWLIST.map(s=>s.toLowerCase().trim()).includes(email);
    if (!allowed){
      return HtmlService.createHtmlOutput(_blockHtml(`❌ Acceso denegado para: ${email}`))
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    // ➕ Render con inyección de window.__GAS_APP_URL__ (en <head>)
    return renderIndex_();
  } catch (e2){
    console.error('[doGet UI]', e2 && e2.stack ? e2.stack : e2);
    return HtmlService.createHtmlOutput(_blockHtml("❌ Error interno cargando la app."))
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// Inyecta en el HTML final la URL del web app (meta + window.__GAS_APP_URL__) antes de </head>
function renderIndex_(){
  const selfUrl = ScriptApp.getService().getUrl();
  // 1) Render base desde el archivo "Index"
  var htmlBase = HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("APAD | NoteApp")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  var content = htmlBase.getContent();

  // 2) Inyección en <head> para que esté disponible antes del bundle
  var inject =
    '<meta name="gas-app-url" content="' + selfUrl.replace(/"/g, '&quot;') + '">\n' +
    '<script>window.__GAS_APP_URL__ = ' + JSON.stringify(selfUrl) + ';</script>\n';

  if (content.indexOf('</head>') !== -1) {
    content = content.replace('</head>', inject + '</head>');
  } else {
    // Fallback: si no hay <head>, lo insertamos al principio del body
    content = content.replace('<body', '<body>\n' + inject + '\n');
  }

  // 3) Devolver HtmlOutput con el contenido inyectado
  return HtmlService.createHtmlOutput(content)
    .setTitle("APAD | NoteApp")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e){
  const route = e && e.parameter && e.parameter.route;
  let body = {};
  try { body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {}; }
  catch(_) { body = {}; }

  try{
    if (route === 'notes.appendBatch') {
      const email = resolveEmail_(e);
      const agentName = String(body.agentName || body.agent || email || 'unknown');
      const events = Array.isArray(body.events) ? body.events : [];
      const res = sb_appendNotesBatch_(agentName, events);
      return json_(res);
    }

    if (route === 'shortkeys.upsert') {
      const payload = body && body.payload;
      if (!payload) return json_({ inserted:0, error:'payload requerido' });
      const res = sb_upsertShortkey_(payload);
      return json_(res);
    }

    if (route === 'prefs.set') {
      const name = (body && body.agentName) || '';
      const res = sb_setPref_(resolveEmail_(e), String(name||'').trim());
      return json_(res);
    }

    return json_({ error:'Not found' });
  } catch (err){
    console.error('[doPost route error]', err && err.stack || err);
    return json_({ error: String(err && err.message || err) });
  }
}
