const { hasStorage, storageMode, listEvents, listSubmissions } = require("./_lib/storage.js");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function hasExcelWebhook() {
  return Boolean(process.env.DOCROI_ANALYTICS_WEBHOOK_URL || process.env.DOCROI_CRM_WEBHOOK_URL);
}

module.exports = async function handler(req, res) {
  try {
    const dateFrom = req.query.date_from || process.env.CAMPAIGN_START_DATE || "2026-06-16";
    const dateTo = req.query.date_to || today();
    const events = await listEvents(dateFrom, dateTo);
    const submissions = await listSubmissions(dateFrom, dateTo);
    res.status(200).json({
      ok: true,
      capture_ready: hasStorage() || hasExcelWebhook(),
      storage_ready: hasStorage(),
      excel_webhook_ready: hasExcelWebhook(),
      storage_mode: storageMode(),
      date_from: dateFrom,
      date_to: dateTo,
      event_count: events.length,
      submission_count: submissions.length,
      last_event: events[events.length - 1] || null,
      last_submission: submissions[submissions.length - 1] || null,
      required_env: {
        DOCROI_ANALYTICS_WEBHOOK_URL: Boolean(process.env.DOCROI_ANALYTICS_WEBHOOK_URL),
        DOCROI_CRM_WEBHOOK_URL: Boolean(process.env.DOCROI_CRM_WEBHOOK_URL),
        SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        GITHUB_TOKEN: Boolean(process.env.GITHUB_TOKEN),
        CAMPAIGN_START_DATE: Boolean(process.env.CAMPAIGN_START_DATE)
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: "debug_failed", detail: String(error && error.message || error) });
  }
};