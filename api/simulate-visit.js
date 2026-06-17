const { appendEvent, appendSubmission, dateFromIso, hasStorage } = require("./_lib/storage.js");

function uid(prefix) {
  return `${prefix}_sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function todayIso() {
  return new Date().toISOString();
}

function excelReady() {
  return Boolean(process.env.DOCROI_ANALYTICS_WEBHOOK_URL || process.env.DOCROI_CRM_WEBHOOK_URL);
}

async function forwardToExcel(type, payload) {
  const url = type === "crm_lead"
    ? (process.env.DOCROI_CRM_WEBHOOK_URL || process.env.DOCROI_ANALYTICS_WEBHOOK_URL)
    : process.env.DOCROI_ANALYTICS_WEBHOOK_URL;
  if (!url) return { ok: true, mode: "no_excel_webhook" };
  const body = type === "crm_lead" ? { type, lead: payload } : { type, event: payload };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Excel webhook failed ${response.status}`);
  return { ok: true, mode: "forwarded_to_excel" };
}

module.exports = async function handler(req, res) {
  try {
    const now = todayIso();
    const date = dateFromIso(now);
    const browserId = req.query.browser_id || uid("br");
    const sessionId = req.query.session_id || uid("ss");
    const visitId = uid("visit");
    const common = {
      timestamp: now,
      event_ts: now,
      event_date: date,
      app_name: "botiquin",
      source_app: "botiquin",
      browser_id: browserId,
      session_id: sessionId,
      visit_id: visitId,
      page_url: "https://el-botiquin-del-doc-roi.vercel.app/?utm_source=simulacion&utm_medium=test&utm_campaign=lanzamiento_docroi",
      page_path: "/",
      page_title: "Mi Botiquin | Doc ROI",
      referrer: "https://bsc-doc-roi.vercel.app/api/simulate-visit",
      utm_source: "simulacion",
      utm_medium: "test",
      utm_campaign: "lanzamiento_docroi",
      device_type: "desktop",
      browser_name: "Simulated",
      operating_system: "Simulated",
      language: "es-ES",
      timezone: "Europe/Madrid"
    };

    const events = [
      { ...common, event_id: uid("evt"), event_type: "page_view", keyword: "Botiquin", keyword_id: "KW_BOTIQUIN" },
      { ...common, event_id: uid("evt"), event_type: "section_view", section_id: "pildoras", section_name: "Pildoras Doc ROI", keyword: "Pildora", keyword_id: "KW_PILDORA", visible_percent: 75, time_to_view_seconds: 6 },
      { ...common, event_id: uid("evt"), event_type: "content_impression", content_id: "connection-01-gmail-ia-sheet", content_title: "Connection 01 Gmail IA Sheet", content_type: "pildora", content_keyword: "Pildora", keyword: "Pildora", keyword_id: "KW_PILDORA" },
      { ...common, event_id: uid("evt"), event_type: "button_click", button_id: "sim_boton_pildora", button_text: "Abrir pildora", button_keyword: "Pildora", keyword: "Pildora", keyword_id: "KW_PILDORA", destination_type: "resource", destination_url: "https://docroi.marketing/1st-connection-%c2%b7-gmail-ai-sheet/" },
      { ...common, event_id: uid("evt"), event_type: "button_click", button_id: "sim_executive", button_text: "Abrir DocROI Executive", button_keyword: "Executive", keyword: "Executive", keyword_id: "KW_EXECUTIVE", destination_type: "executive", destination_url: "https://doc-roi-executive.vercel.app/" }
    ];

    const results = [];
    for (const event of events) {
      const storage = await appendEvent(event);
      const excel = await forwardToExcel("analytics_event", event);
      results.push({ storage, excel });
    }

    if (req.query.lead === "1") {
      const submission = {
        submission_id: uid("sub"),
        timestamp: now,
        event_date: date,
        source_app: "executive",
        form_type: "in_company",
        browser_id: browserId,
        session_id: sessionId,
        visit_id: visitId,
        urgent: true,
        contact_name: "Lead simulado Doc ROI",
        company: "Empresa simulada",
        email: "demo@example.com",
        phone: "+34000000000",
        demand_summary: "Simulacion de lead para comprobar dashboard",
        lead_score: 85,
        lead_status: "new",
        recommended_next_action: "comprobar integracion",
        utm_source: "simulacion",
        utm_medium: "test",
        utm_campaign: "lanzamiento_docroi",
        previous_keywords: ["Pildora", "Executive"]
      };
      const storage = await appendSubmission(submission);
      const excel = await forwardToExcel("crm_lead", submission);
      results.push({ storage, excel });
    }

    res.status(200).json({
      ok: true,
      capture_ready: hasStorage() || excelReady(),
      storage_ready: hasStorage(),
      excel_webhook_ready: excelReady(),
      message: hasStorage() || excelReady() ? "Visita simulada enviada. Revisa Excel o el dashboard configurado." : "No hay storage ni webhook Excel: la simulacion se acepta pero no se guarda.",
      browser_id: browserId,
      session_id: sessionId,
      events_created: events.length,
      results
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: "simulate_failed", detail: String(error && error.message || error) });
  }
};