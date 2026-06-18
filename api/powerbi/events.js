const { listEvents } = require("../_lib/storage.js");
const { dateFrom, dateTo, sendCsv } = require("./_csv.js");

const headers = [
  "event_id", "timestamp", "event_date", "app_name", "event_type", "browser_id", "session_id", "visit_id",
  "page_url", "page_path", "page_title", "referrer", "keyword", "keyword_id", "button_id", "button_text",
  "button_keyword", "section_id", "section_name", "content_id", "content_title", "content_type", "destination_url",
  "destination_domain", "destination_type", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "device_type", "browser_name", "operating_system", "screen_width", "screen_height", "language", "timezone",
  "depth_percent", "active_seconds", "total_active_seconds"
];

module.exports = async function handler(req, res) {
  try {
    const rows = await listEvents(dateFrom(req), dateTo(req));
    sendCsv(res, "docroi-powerbi-events", rows, headers);
  } catch (error) {
    res.status(500).send("error\npowerbi_events_failed\n");
  }
};