const allowedOrigins = [
  "https://el-botiquin-del-doc-roi.vercel.app",
  "https://doc-roi-executive.vercel.app"
];

function cors(req, res) {
  const origin = req.headers.origin || "";
  if (allowedOrigins.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function sanitize(input) {
  const fields = ["event_id", "event_ts", "event_date", "source_site", "browser_id", "session_id", "event_type", "page_url", "page_path", "referrer", "link_id", "link_url", "link_text", "keyword", "keyword_id", "area", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "device_type", "language", "country"];
  const event = {};
  for (const key of fields) {
    const value = input && input[key];
    event[key] = typeof value === "string" ? value.slice(0, 1000) : value || "";
  }
  event.received_at = new Date().toISOString();
  return event;
}

async function forward(payload) {
  const webhook = process.env.DOCROI_ANALYTICS_WEBHOOK_URL;
  if (!webhook) return { ok: true, mode: "accepted_without_storage" };
  const response = await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": process.env.DOCROI_ANALYTICS_WEBHOOK_SECRET ? `Bearer ${process.env.DOCROI_ANALYTICS_WEBHOOK_SECRET}` : ""
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Webhook failed with ${response.status}`);
  return { ok: true, mode: "forwarded_to_webhook" };
}

module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  try {
    const event = sanitize(req.body || {});
    const result = await forward({ type: "analytics_event", event });
    res.status(202).json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: "collect_failed" });
  }
};
