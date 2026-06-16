const DEFAULT_OWNER = "docr-ROI-diagostic-ecuacion-KAI";
const DEFAULT_REPO = "BSC-DocROI";
const DEFAULT_BRANCH = "main";
const DEFAULT_DATA_PATH = "data";

function env(name, fallback = "") { return process.env[name] || fallback; }

function supabaseReady() { return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }
function githubReady() { return Boolean(process.env.GITHUB_TOKEN); }
function hasStorage() { return supabaseReady() || githubReady(); }
function storageMode() { if (supabaseReady()) return "supabase"; if (githubReady()) return "github"; return "none"; }

function dateFromIso(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function monthFromIso(value) { return dateFromIso(value).slice(0, 7); }

function dateRange(from, to) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  const days = [];
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
  return days;
}

function monthRange(from, to) { return [...new Set(dateRange(from, to).map((day) => day.slice(0, 7)))]; }

function normalizeNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function eventRow(event) {
  return {
    event_id: event.event_id,
    timestamp: event.timestamp || event.event_ts || new Date().toISOString(),
    received_at: event.received_at || new Date().toISOString(),
    app_name: event.app_name || event.source_app || event.source_site || "unknown",
    source_app: event.source_app || event.app_name || event.source_site || "unknown",
    event_type: event.event_type,
    browser_id: event.browser_id,
    session_id: event.session_id,
    visit_id: event.visit_id || null,
    page_url: event.page_url || null,
    page_path: event.page_path || null,
    page_title: event.page_title || null,
    referrer: event.referrer || null,
    keyword: event.keyword || null,
    keyword_id: event.keyword_id || null,
    button_id: event.button_id || null,
    button_text: event.button_text || event.link_text || null,
    button_keyword: event.button_keyword || null,
    button_group: event.button_group || null,
    section_id: event.section_id || null,
    section_name: event.section_name || null,
    content_id: event.content_id || null,
    content_title: event.content_title || null,
    content_type: event.content_type || null,
    content_status: event.content_status || null,
    content_keyword: event.content_keyword || null,
    destination_url: event.destination_url || event.link_url || null,
    destination_domain: event.destination_domain || null,
    destination_type: event.destination_type || null,
    utm_source: event.utm_source || null,
    utm_medium: event.utm_medium || null,
    utm_campaign: event.utm_campaign || null,
    utm_content: event.utm_content || null,
    utm_term: event.utm_term || null,
    campaign_keyword: event.campaign_keyword || null,
    device_type: event.device_type || null,
    browser_name: event.browser_name || null,
    operating_system: event.operating_system || null,
    screen_width: normalizeNumber(event.screen_width),
    screen_height: normalizeNumber(event.screen_height),
    language: event.language || null,
    timezone: event.timezone || null,
    consent_status: event.consent_status || null,
    user_agent_hash: event.user_agent_hash || null,
    depth_percent: normalizeNumber(event.depth_percent),
    max_scroll_percent: normalizeNumber(event.max_scroll_percent),
    active_seconds: normalizeNumber(event.active_seconds),
    total_active_seconds: normalizeNumber(event.total_active_seconds),
    visible_percent: normalizeNumber(event.visible_percent),
    time_to_view_seconds: normalizeNumber(event.time_to_view_seconds),
    raw: event
  };
}

function leadRow(lead) {
  return {
    submission_id: lead.submission_id || lead.lead_id,
    timestamp: lead.timestamp || lead.created_ts || new Date().toISOString(),
    received_at: lead.received_at || new Date().toISOString(),
    source_app: lead.source_app || "executive",
    form_id: lead.form_id || null,
    form_type: lead.form_type || lead.form_kind || lead.business_model_id || "unknown",
    business_model_id: lead.business_model_id || null,
    stage_id: lead.stage_id || null,
    lead_status: lead.lead_status || "new",
    browser_id: lead.browser_id,
    session_id: lead.session_id,
    visit_id: lead.visit_id || null,
    urgent: lead.urgent === true || lead.urgent === "true" || lead.urgency_id === "HIGH" || lead.urgency_id === "CRITICAL",
    urgency_id: lead.urgency_id || null,
    priority: lead.priority || null,
    lead_score: normalizeNumber(lead.lead_score) || 0,
    recommended_next_action: lead.recommended_next_action || lead.next_action || null,
    contact_name: lead.contact_name || lead.nombre_apellidos || null,
    role: lead.role || lead.cargo || null,
    company: lead.company || lead.institucion_empresa || lead.institution_or_company || lead.organization || null,
    email: lead.email || null,
    phone: lead.phone || lead.telefono || null,
    demand_summary: lead.demand_summary || null,
    need_summary: lead.need_summary || null,
    expected_date: lead.expected_date || null,
    consent_privacy_checked: lead.consent_privacy_checked === true || lead.privacidad_aceptada === true || lead.consent === "Si",
    landing_page: lead.landing_page || null,
    current_page_path: lead.current_page_path || null,
    page_url: lead.page_url || null,
    referrer: lead.referrer || null,
    utm_source: lead.utm_source || null,
    utm_medium: lead.utm_medium || null,
    utm_campaign: lead.utm_campaign || null,
    utm_content: lead.utm_content || null,
    utm_term: lead.utm_term || null,
    campaign_keyword: lead.campaign_keyword || null,
    previous_keywords: Array.isArray(lead.previous_keywords) ? lead.previous_keywords : [],
    notes: lead.notes || null,
    raw: lead
  };
}

async function supabaseRequest(path, options = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Supabase ${path} failed ${response.status}: ${await response.text()}`);
  if (response.status === 204) return [];
  return response.json();
}

async function appendEventSupabase(event) {
  await supabaseRequest("docroi_events?on_conflict=event_id", { method: "POST", body: JSON.stringify(eventRow(event)) });
  return { ok: true, mode: "stored", storage: "supabase" };
}

async function appendSubmissionSupabase(submission) {
  await supabaseRequest("docroi_leads?on_conflict=submission_id", { method: "POST", body: JSON.stringify(leadRow(submission)) });
  return { ok: true, mode: "stored", storage: "supabase" };
}

async function listEventsSupabase(dateFrom, dateTo) {
  const query = `docroi_events?event_date=gte.${dateFrom}&event_date=lte.${dateTo}&order=timestamp.asc&limit=50000`;
  return supabaseRequest(query, { method: "GET" });
}

async function listSubmissionsSupabase(dateFrom, dateTo) {
  const query = `docroi_leads?event_date=gte.${dateFrom}&event_date=lte.${dateTo}&order=timestamp.desc&limit=50000`;
  return supabaseRequest(query, { method: "GET" });
}

function githubConfig() {
  return { token: env("GITHUB_TOKEN"), owner: env("GITHUB_OWNER", DEFAULT_OWNER), repo: env("GITHUB_REPO", DEFAULT_REPO), branch: env("GITHUB_BRANCH", DEFAULT_BRANCH), dataPath: env("GITHUB_DATA_PATH", DEFAULT_DATA_PATH) };
}
function githubHeaders() { return { Accept: "application/vnd.github+json", Authorization: `Bearer ${githubConfig().token}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" }; }
function apiUrl(path) { const { owner, repo } = githubConfig(); return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`; }
function b64Encode(text) { return Buffer.from(text, "utf8").toString("base64"); }
function b64Decode(text) { return Buffer.from(text || "", "base64").toString("utf8"); }
async function readFile(path) { const { branch } = githubConfig(); const r = await fetch(`${apiUrl(path)}?ref=${encodeURIComponent(branch)}`, { headers: githubHeaders() }); if (r.status === 404) return { exists: false, content: "", sha: null }; if (!r.ok) throw new Error(`GitHub read failed ${r.status}`); const data = await r.json(); return { exists: true, content: b64Decode(data.content), sha: data.sha }; }
async function writeFile(path, content, sha, message) { const { branch } = githubConfig(); const body = { message, content: b64Encode(content), branch }; if (sha) body.sha = sha; const r = await fetch(apiUrl(path), { method: "PUT", headers: githubHeaders(), body: JSON.stringify(body) }); if (!r.ok) throw new Error(`GitHub write failed ${r.status}: ${await r.text()}`); return r.json(); }
function parseLines(content) { return content.split(/\r?\n/).filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean); }
async function appendNdjson(path, record, uniqueKey) { if (!githubReady()) return { ok: true, mode: "accepted_without_storage", storage: "none" }; const current = await readFile(path); const rows = parseLines(current.content); if (uniqueKey && record[uniqueKey] && rows.some((row) => row[uniqueKey] === record[uniqueKey])) return { ok: true, mode: "duplicate_ignored", storage: "github", path }; const next = `${current.content || ""}${current.content && !current.content.endsWith("\n") ? "\n" : ""}${JSON.stringify(record)}\n`; await writeFile(path, next, current.sha, `Append Doc ROI data ${path}`); return { ok: true, mode: "stored", storage: "github", path }; }
function eventPath(date) { return `${githubConfig().dataPath}/events/${date}.ndjson`; }
function submissionPath(month) { return `${githubConfig().dataPath}/submissions/${month}.ndjson`; }
async function appendEventGithub(event) { return appendNdjson(eventPath(event.event_date || dateFromIso(event.timestamp || event.event_ts)), event, "event_id"); }
async function appendSubmissionGithub(submission) { return appendNdjson(submissionPath(monthFromIso(submission.timestamp || submission.created_ts)), submission, "submission_id"); }
async function listEventsGithub(dateFrom, dateTo) { const rows = []; for (const day of dateRange(dateFrom, dateTo)) { const file = await readFile(eventPath(day)); if (file.exists) rows.push(...parseLines(file.content)); } return rows; }
async function listSubmissionsGithub(dateFrom, dateTo) { const rows = []; for (const month of monthRange(dateFrom, dateTo)) { const file = await readFile(submissionPath(month)); if (file.exists) rows.push(...parseLines(file.content)); } return rows.filter((row) => { const day = dateFromIso(row.timestamp || row.created_ts); return day >= dateFrom && day <= dateTo; }); }

async function appendEvent(event) { if (supabaseReady()) return appendEventSupabase(event); return appendEventGithub(event); }
async function appendSubmission(submission) { if (supabaseReady()) return appendSubmissionSupabase(submission); return appendSubmissionGithub(submission); }
async function listEvents(dateFrom, dateTo) { if (supabaseReady()) return listEventsSupabase(dateFrom, dateTo); if (githubReady()) return listEventsGithub(dateFrom, dateTo); return []; }
async function listSubmissions(dateFrom, dateTo) { if (supabaseReady()) return listSubmissionsSupabase(dateFrom, dateTo); if (githubReady()) return listSubmissionsGithub(dateFrom, dateTo); return []; }

module.exports = { hasStorage, storageMode, appendEvent, appendSubmission, listEvents, listSubmissions, dateFromIso };
