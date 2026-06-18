const { listEvents, listSubmissions } = require("../_lib/storage.js");
const { summarize } = require("../_lib/metrics.js");
const { dateFrom, dateTo, sendCsv } = require("./_csv.js");

const headers = [
  "date_from", "date_to", "generated_at", "botiquin_visits", "botiquin_browsers", "botiquin_sessions", "botiquin_clicks",
  "botiquin_impressions", "botiquin_ctr", "executive_visits", "executive_browsers", "executive_sessions", "form_starts",
  "form_submits", "urgent_submissions", "urgent_percent", "botiquin_to_executive", "botiquin_to_executive_rate",
  "total_events", "capture_ready", "excel_webhook_ready"
];

module.exports = async function handler(req, res) {
  try {
    const from = dateFrom(req);
    const to = dateTo(req);
    const events = await listEvents(from, to);
    const submissions = await listSubmissions(from, to);
    sendCsv(res, "docroi-powerbi-summary", [{
      date_from: from,
      date_to: to,
      generated_at: new Date().toISOString(),
      ...summarize(events, submissions)
    }], headers);
  } catch (error) {
    res.status(500).send("error\npowerbi_summary_failed\n");
  }
};