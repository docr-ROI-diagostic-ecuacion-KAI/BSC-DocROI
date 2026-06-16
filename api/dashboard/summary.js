const { listEvents, listSubmissions } = require("../_lib/storage.js");
const { summarize, keywordRows, cohorts, leadsTable } = require("../_lib/metrics.js");

function today() { return new Date().toISOString().slice(0, 10); }
function startDefault() { return process.env.CAMPAIGN_START_DATE || "2026-06-16"; }

module.exports = async function handler(req, res) {
  try {
    const dateFrom = req.query.date_from || startDefault();
    const dateTo = req.query.date_to || today();
    const events = await listEvents(dateFrom, dateTo);
    const submissions = await listSubmissions(dateFrom, dateTo);
    res.status(200).json({
      ok: true,
      date_from: dateFrom,
      date_to: dateTo,
      generated_at: new Date().toISOString(),
      summary: summarize(events, submissions),
      top_keywords: keywordRows(events, submissions).slice(0, 20),
      cohorts: cohorts(events, submissions).slice(0, 100),
      leads: leadsTable(submissions).slice(0, 100)
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: "summary_failed" });
  }
};
