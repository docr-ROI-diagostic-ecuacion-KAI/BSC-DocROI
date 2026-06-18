const { listSubmissions } = require("../_lib/storage.js");
const { leadsTable } = require("../_lib/metrics.js");
const { dateFrom, dateTo, sendCsv } = require("./_csv.js");

const headers = [
  "timestamp", "form_type", "urgent", "institution_company", "contact_name", "role", "email", "phone",
  "demand_type", "need", "modality", "language", "utm_source", "utm_campaign", "previous_keywords", "browser_id",
  "lead_score", "lead_status", "recommended_next_action"
];

module.exports = async function handler(req, res) {
  try {
    const submissions = await listSubmissions(dateFrom(req), dateTo(req));
    sendCsv(res, "docroi-powerbi-leads", leadsTable(submissions), headers);
  } catch (error) {
    res.status(500).send("error\npowerbi_leads_failed\n");
  }
};