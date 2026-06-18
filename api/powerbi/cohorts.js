const { listEvents, listSubmissions } = require("../_lib/storage.js");
const { cohorts } = require("../_lib/metrics.js");
const { dateFrom, dateTo, sendCsv } = require("./_csv.js");

const headers = [
  "keyword", "date", "browsers", "sessions", "visits", "impressions", "clicks", "ctr", "frequency_per_browser",
  "recurrent_browsers", "new_browsers", "conversions_to_executive"
];

module.exports = async function handler(req, res) {
  try {
    const from = dateFrom(req);
    const to = dateTo(req);
    const events = await listEvents(from, to);
    const submissions = await listSubmissions(from, to);
    sendCsv(res, "docroi-powerbi-cohorts", cohorts(events, submissions), headers);
  } catch (error) {
    res.status(500).send("error\npowerbi_cohorts_failed\n");
  }
};