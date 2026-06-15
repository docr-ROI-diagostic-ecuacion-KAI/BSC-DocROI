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
  const fields = ["lead_id", "created_ts", "source_site", "business_model_id", "stage_id", "urgency_id", "contact_name", "company", "email", "phone", "role", "need_summary", "budget_range", "expected_date", "owner", "next_action_date", "next_action", "lead_score", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "browser_id", "session_id", "consent", "notes"];
  const lead = {};
  for (const key of fields) {
    const value = input && input[key];
    lead[key] = typeof value === "string" ? value.slice(0, 2000) : value || "";
  }
  lead.lead_id = lead.lead_id || `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  lead.created_ts = lead.created_ts || new Date().toISOString();
  lead.stage_id = lead.stage_id || "COLD";
  lead.received_at = new Date().toISOString();
  return lead;
}

async function forward(payload) {
  const webhook = process.env.DOCROI_CRM_WEBHOOK_URL || process.env.DOCROI_ANALYTICS_WEBHOOK_URL;
  if (!webhook) return { ok: true, mode: "accepted_without_storage" };
  const response = await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": process.env.DOCROI_CRM_WEBHOOK_SECRET ? `Bearer ${process.env.DOCROI_CRM_WEBHOOK_SECRET}` : ""
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
    const lead = sanitize(req.body || {});
    const result = await forward({ type: "crm_lead", lead });
    res.status(202).json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: "lead_failed" });
  }
};
