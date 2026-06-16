const { appendEvent, appendSubmission, dateFromIso } = require("./_lib/storage.js");

const allowedOrigins = [
  "https://doc-roi-executive.vercel.app",
  "https://bsc-doc-roi-61qn.vercel.app"
];

function cors(req, res) {
  const origin = req.headers.origin || "";
  if (allowedOrigins.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-DocROI-Tracking-Secret");
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function asBool(value) {
  return value === true || value === "true" || value === "on" || value === "Si" || value === "sí";
}

function score(lead) {
  let total = 0;
  if (asBool(lead.urgent) || lead.urgency_id === "HIGH" || lead.urgency_id === "CRITICAL") total += 30;
  if (lead.botiquin_to_executive || lead.previous_botiquin_browser_match) total += 20;
  if (lead.institucion_empresa || lead.company || lead.institution_or_company || lead.organization) total += 15;
  if (lead.demand_summary || lead.need_summary || lead.necesidad_principal || lead.disciplina_asignatura_modulo || lead.tipo_apoyo) total += 15;
  if (lead.calendario_deseado || lead.expected_date || lead.fecha_aproximada_urgencia) total += 10;
  if ((lead.form_type === "in_company" || lead.business_model_id === "BM_INCOMPANY") && Number(lead.numero_aproximado_personas || lead.approx_people_to_train || 0) > 10) total += 10;
  if (lead.modalidad || lead.preferred_modality || lead.idioma || lead.language) total += 5;
  return Math.min(total, 100);
}

function priority(scoreValue) {
  if (scoreValue >= 80) return "alta";
  if (scoreValue >= 50) return "media";
  return "exploratoria";
}

function sanitize(input) {
  const lead = { ...input };
  lead.submission_id = String(lead.submission_id || lead.lead_id || uid("sub"));
  lead.timestamp = String(lead.timestamp || lead.created_ts || new Date().toISOString());
  lead.event_date = String(lead.event_date || dateFromIso(lead.timestamp));
  lead.source_app = "executive";
  lead.form_type = String(lead.form_type || lead.form_kind || lead.business_model_id || "unknown");
  lead.browser_id = String(lead.browser_id || "");
  lead.session_id = String(lead.session_id || "");
  lead.visit_id = String(lead.visit_id || "");
  lead.urgent = asBool(lead.urgent || lead.priority_contact || lead.urgency_id === "HIGH");
  lead.consent_privacy_checked = asBool(lead.consent_privacy_checked || lead.privacidad_aceptada || lead.consent || lead.legal_notice_acceptance);
  lead.lead_score = Number(lead.lead_score || score(lead));
  lead.priority = lead.priority || priority(lead.lead_score);
  lead.lead_status = lead.lead_status || "new";
  lead.recommended_next_action = lead.recommended_next_action || lead.accion_recomendada || lead.next_action || "contactar y cualificar";
  lead.received_at = new Date().toISOString();
  return lead;
}

module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  try {
    const submission = sanitize(req.body || {});
    if (!submission.browser_id || !submission.session_id || !submission.form_type) {
      return res.status(400).json({ ok: false, error: "invalid_submission" });
    }
    const stored = await appendSubmission(submission);
    await appendEvent({
      event_id: `evt_${submission.submission_id}`,
      timestamp: submission.timestamp,
      event_ts: submission.timestamp,
      event_date: submission.event_date,
      app_name: "executive",
      source_app: "executive",
      event_type: "form_submit_success",
      browser_id: submission.browser_id,
      session_id: submission.session_id,
      visit_id: submission.visit_id,
      form_id: submission.form_id || submission.form_type,
      form_type: submission.form_type,
      keyword: "Executive",
      keyword_id: "KW_EXECUTIVE",
      page_url: submission.page_url || submission.landing_page || "",
      page_path: submission.current_page_path || "",
      lead_score: submission.lead_score
    });
    res.status(202).json({ ok: true, ...stored, submission_id: submission.submission_id, lead_score: submission.lead_score });
  } catch (error) {
    res.status(500).json({ ok: false, error: "form_submit_failed" });
  }
};
