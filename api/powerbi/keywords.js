const { listEvents, listSubmissions } = require("../_lib/storage.js");
const { keywordRows } = require("../_lib/metrics.js");
const { dateFrom, dateTo, sendCsv } = require("./_csv.js");

const headers = [
  "keyword", "browsers", "sessions", "visits", "impressions", "clicks", "ctr", "frequency_per_browser", "conversions_to_executive"
];

module.exports = async function handler(req, res) {
  try {
    const from = dateFrom(req);
    const to = dateTo(req);
    const events = await listEvents(from, to);
    const submissions = await listSubmissions(from, to);
    sendCsv(res, "docroi-powerbi-keywords", keywordRows(events, submissions), headers);
  } catch (error) {
    res.status(500).send("error\npowerbi_keywords_failed\n");
  }
};