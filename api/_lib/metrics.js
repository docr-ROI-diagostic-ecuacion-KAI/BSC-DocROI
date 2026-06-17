function uniq(rows, key) {
  return new Set(rows.map((row) => row[key]).filter(Boolean));
}

function pct(num, den) {
  return den ? Math.round((num / den) * 10000) / 100 : 0;
}

function eventKeyword(event) {
  return event.keyword || event.button_keyword || event.content_keyword || event.keyword_id || event.campaign_keyword || "Sin keyword";
}

function app(event) {
  return (event.app_name || event.source_app || event.source_site || "").toLowerCase();
}

function isBotiquin(event) {
  return app(event).includes("botiquin");
}

function isExecutive(event) {
  return app(event).includes("executive");
}

function isClick(event) {
  return ["button_click", "content_click", "link_click", "outbound_click", "cta_click"].includes(event.event_type);
}

function isImpression(event) {
  return ["content_impression", "section_view", "form_view"].includes(event.event_type);
}

function captureReady() {
  return Boolean(
    process.env.GITHUB_TOKEN ||
    (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    process.env.DOCROI_ANALYTICS_WEBHOOK_URL ||
    process.env.DOCROI_CRM_WEBHOOK_URL
  );
}

function summarize(events, submissions) {
  const botiquin = events.filter(isBotiquin);
  const executive = events.filter(isExecutive);
  const botClicks = botiquin.filter(isClick);
  const impressions = botiquin.filter(isImpression);
  const executiveBrowsers = uniq(executive, "browser_id");
  const botBrowsers = uniq(botiquin, "browser_id");
  const botToExecutive = [...botBrowsers].filter((id) => executiveBrowsers.has(id)).length;
  const urgent = submissions.filter((lead) => lead.urgent === true || lead.urgent === "true" || lead.urgency_id === "HIGH" || lead.urgency_id === "CRITICAL");

  return {
    botiquin_visits: botiquin.filter((event) => event.event_type === "page_view").length,
    botiquin_browsers: botBrowsers.size,
    botiquin_sessions: uniq(botiquin, "session_id").size,
    botiquin_clicks: botClicks.length,
    botiquin_impressions: impressions.length,
    botiquin_ctr: pct(botClicks.length, impressions.length),
    executive_visits: executive.filter((event) => event.event_type === "page_view").length,
    executive_browsers: executiveBrowsers.size,
    executive_sessions: uniq(executive, "session_id").size,
    form_starts: executive.filter((event) => event.event_type === "form_start").length,
    form_submits: submissions.length,
    urgent_submissions: urgent.length,
    urgent_percent: pct(urgent.length, submissions.length),
    botiquin_to_executive: botToExecutive,
    botiquin_to_executive_rate: pct(botToExecutive, botBrowsers.size),
    total_events: events.length,
    storage_ready: captureReady(),
    capture_ready: captureReady(),
    excel_webhook_ready: Boolean(process.env.DOCROI_ANALYTICS_WEBHOOK_URL || process.env.DOCROI_CRM_WEBHOOK_URL)
  };
}

function groupBy(rows, keyFn) {
  return rows.reduce((acc, row) => {
    const key = keyFn(row);
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});
}

function keywordRows(events, submissions) {
  const groups = groupBy(events.filter((event) => eventKeyword(event) !== "Sin keyword"), eventKeyword);
  return Object.entries(groups).map(([keyword, rows]) => {
    const impressions = rows.filter(isImpression).length;
    const clicks = rows.filter(isClick).length;
    const browsers = uniq(rows, "browser_id");
    const sessionCount = uniq(rows, "session_id").size;
    const executiveConversions = submissions.filter((lead) => {
      const prev = Array.isArray(lead.previous_keywords) ? lead.previous_keywords : [];
      return prev.includes(keyword) || lead.keyword === keyword || lead.campaign_keyword === keyword;
    }).length;
    return {
      keyword,
      browsers: browsers.size,
      sessions: sessionCount,
      visits: rows.filter((event) => event.event_type === "page_view").length,
      impressions,
      clicks,
      ctr: pct(clicks, impressions),
      frequency_per_browser: browsers.size ? Math.round((rows.length / browsers.size) * 100) / 100 : 0,
      conversions_to_executive: executiveConversions
    };
  }).sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
}

function cohorts(events, submissions) {
  const groups = groupBy(events, (event) => `${eventKeyword(event)}|${event.event_date || (event.timestamp || event.event_ts || "").slice(0, 10)}`);
  return Object.entries(groups).map(([key, rows]) => {
    const [keyword, date] = key.split("|");
    const browsers = uniq(rows, "browser_id");
    const impressions = rows.filter(isImpression).length;
    const clicks = rows.filter(isClick).length;
    const firstSeen = {};
    const lastSeen = {};
    for (const event of events) {
      const id = event.browser_id;
      if (!id) continue;
      const day = event.event_date || (event.timestamp || event.event_ts || "").slice(0, 10);
      if (!firstSeen[id] || day < firstSeen[id]) firstSeen[id] = day;
      if (!lastSeen[id] || day > lastSeen[id]) lastSeen[id] = day;
    }
    const recurrent = [...browsers].filter((id) => firstSeen[id] && firstSeen[id] < date).length;
    return {
      keyword,
      date,
      browsers: browsers.size,
      sessions: uniq(rows, "session_id").size,
      visits: rows.filter((event) => event.event_type === "page_view").length,
      impressions,
      clicks,
      ctr: pct(clicks, impressions),
      frequency_per_browser: browsers.size ? Math.round((rows.length / browsers.size) * 100) / 100 : 0,
      recurrent_browsers: recurrent,
      new_browsers: browsers.size - recurrent,
      conversions_to_executive: submissions.filter((lead) => lead.timestamp && lead.timestamp.slice(0, 10) === date && (lead.previous_keywords || []).includes(keyword)).length
    };
  }).sort((a, b) => `${b.date}${b.clicks}`.localeCompare(`${a.date}${a.clicks}`));
}

function leadsTable(submissions) {
  return submissions.map((lead) => ({
    timestamp: lead.timestamp || lead.created_ts || "",
    form_type: lead.form_type || lead.business_model_id || "",
    urgent: lead.urgent || lead.urgency_id || false,
    institution_company: lead.institucion_empresa || lead.company || lead.institution_or_company || lead.organization || "",
    contact_name: lead.nombre_apellidos || lead.contact_name || "",
    role: lead.cargo || lead.role || "",
    email: maskEmail(lead.email || ""),
    phone: maskPhone(lead.phone || lead.telefono || ""),
    demand_type: lead.demanda_tipo || lead.business_model_id || "",
    need: lead.necesidad_principal || lead.disciplina_asignatura_modulo || lead.tipo_apoyo || lead.need_summary || "",
    modality: lead.modalidad || lead.modalidad_preferida || lead.preferred_modality || "",
    language: lead.idioma || lead.language || "",
    utm_source: lead.utm_source || "",
    utm_campaign: lead.utm_campaign || "",
    previous_keywords: Array.isArray(lead.previous_keywords) ? lead.previous_keywords.join(", ") : (lead.previous_keywords || ""),
    browser_id: shortId(lead.browser_id),
    lead_score: Number(lead.lead_score || 0),
    lead_status: lead.lead_status || lead.stage_id || "new",
    recommended_next_action: lead.recommended_next_action || lead.next_action || ""
  })).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}

function journey(events, submissions, browserId) {
  const timeline = [
    ...events.filter((event) => event.browser_id === browserId).map((event) => ({ type: "event", timestamp: event.timestamp || event.event_ts, data: event })),
    ...submissions.filter((lead) => lead.browser_id === browserId).map((lead) => ({ type: "submission", timestamp: lead.timestamp || lead.created_ts, data: lead }))
  ].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return {
    browser_id: browserId,
    first_visit: timeline[0]?.timestamp || "",
    last_visit: timeline[timeline.length - 1]?.timestamp || "",
    sessions: uniq(timeline.map((item) => item.data), "session_id").size,
    keywords: [...new Set(timeline.map((item) => eventKeyword(item.data)).filter((value) => value && value !== "Sin keyword"))],
    submitted_form: timeline.some((item) => item.type === "submission"),
    timeline
  };
}

function shortId(value) {
  return value ? `${String(value).slice(0, 8)}...` : "";
}

function maskEmail(email) {
  if (!email.includes("@")) return email;
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone) {
  const value = String(phone || "");
  if (value.length < 5) return value;
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}

module.exports = { summarize, keywordRows, cohorts, leadsTable, journey };