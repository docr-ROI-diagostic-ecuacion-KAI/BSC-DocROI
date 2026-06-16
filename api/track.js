const { appendEvent, dateFromIso } = require("./_lib/storage.js");

const allowedOrigins = [
  "https://el-botiquin-del-doc-roi.vercel.app",
  "https://doc-roi-executive.vercel.app",
  "https://bsc-doc-roi.vercel.app",
  "https://bsc-doc-roi-61qn.vercel.app"
];

function cors(req, res) {
  const origin = req.headers.origin || "";
  if (allowedOrigins.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-DocROI-Tracking-Secret");
}

function uid(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`; }

function sanitize(input) {
  const event = { ...input };
  event.event_id = String(event.event_id || uid("evt"));
  event.timestamp = String(event.timestamp || event.event_ts || new Date().toISOString());
  event.event_ts = event.timestamp;
  event.event_date = String(event.event_date || dateFromIso(event.timestamp));
  event.app_name = String(event.app_name || event.source_app || event.source_site || "unknown").toLowerCase();
  event.event_type = String(event.event_type || "event");
  event.browser_id = String(event.browser_id || "");
  event.session_id = String(event.session_id || "");
  event.visit_id = String(event.visit_id || "");
  event.page_url = String(event.page_url || "").slice(0, 2000);
  event.page_path = String(event.page_path || "").slice(0, 500);
  event.page_title = String(event.page_title || "").slice(0, 300);
  event.referrer = String(event.referrer || "").slice(0, 1000);
  event.received_at = new Date().toISOString();
  delete event.user_agent;
  delete event.ip;
  return event;
}

async function forwardToExcelWebhook(event) {
  const url = process.env.DOCROI_ANALYTICS_WEBHOOK_URL;
  if (!url) return { ok: true, mode: "no_excel_webhook" };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "analytics_event", event })
  });
  if (!response.ok) throw new Error(`Excel webhook failed ${response.status}`);
  return { ok: true, mode: "forwarded_to_excel" };
}

module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  try {
    const event = sanitize(req.body || {});
    if (!event.event_id || !event.browser_id || !event.session_id || !event.app_name || !event.event_type) {
      return res.status(400).json({ ok: false, error: "invalid_event" });
    }
    let storageResult = { ok: true, mode: "accepted" };
    try { storageResult = await appendEvent(event); } catch (error) { storageResult = { ok: false, mode: "storage_failed" }; }
    const excelResult = await forwardToExcelWebhook(event);
    res.status(202).json({ ok: true, storage: storageResult, excel: excelResult });
  } catch (error) {
    res.status(500).json({ ok: false, error: "track_failed", detail: String(error && error.message || error) });
  }
};
