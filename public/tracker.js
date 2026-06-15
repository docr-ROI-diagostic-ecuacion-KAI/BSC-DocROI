(function () {
  const config = window.DocROIAnalytics || {};
  const endpoint = config.endpoint || "/api/collect";
  const sourceSite = config.sourceSite || location.hostname;
  const prefix = "docroi_analytics_";

  function uid(label) {
    return `${label}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  }

  function getBrowserId() {
    const key = `${prefix}browser_id`;
    let value = localStorage.getItem(key);
    if (!value) {
      value = uid("br");
      localStorage.setItem(key, value);
    }
    return value;
  }

  function getSessionId() {
    const key = `${prefix}session_id`;
    let value = sessionStorage.getItem(key);
    if (!value) {
      value = uid("ss");
      sessionStorage.setItem(key, value);
    }
    return value;
  }

  function getUtm() {
    const params = new URLSearchParams(location.search);
    const utm = {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_content: params.get("utm_content") || "",
      utm_term: params.get("utm_term") || ""
    };
    if (Object.values(utm).some(Boolean)) {
      localStorage.setItem(`${prefix}utm`, JSON.stringify(utm));
      return utm;
    }
    try { return JSON.parse(localStorage.getItem(`${prefix}utm`) || "{}"); }
    catch { return utm; }
  }

  function deviceType() {
    const width = window.innerWidth || document.documentElement.clientWidth;
    if (width < 768) return "mobile";
    if (width < 1100) return "tablet";
    return "desktop";
  }

  function normalizeKeywordId(keyword) {
    if (!keyword) return "";
    return "KW_" + keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toUpperCase();
  }

  function inferKeyword(href, text) {
    const value = `${href} ${text}`.toLowerCase();
    if (value.includes("pildora") || value.includes("píldora")) return "Pildora";
    if (value.includes("vitamina")) return "Vitamina";
    if (value.includes("medicina")) return "Medicina";
    if (value.includes("kai")) return "Ecuacion KAI";
    if (value.includes("executive")) return "Executive";
    if (value.includes("diagnost")) return "Diagnostico";
    if (value.includes("incompany")) return "Incompany";
    if (value.includes("formacion") || value.includes("formación")) return "Formacion";
    return "Botiquin";
  }

  function payload(type, extra) {
    return {
      event_id: uid("evt"),
      event_ts: new Date().toISOString(),
      event_date: new Date().toISOString().slice(0, 10),
      source_site: sourceSite,
      browser_id: getBrowserId(),
      session_id: getSessionId(),
      event_type: type,
      page_url: location.href,
      page_path: location.pathname,
      referrer: document.referrer || "",
      device_type: deviceType(),
      language: navigator.language || "",
      ...getUtm(),
      ...(extra || {})
    };
  }

  function send(data) {
    const body = JSON.stringify(data);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      return;
    }
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(function () {});
  }

  function track(type, extra) { send(payload(type, extra)); }

  document.addEventListener("click", function (event) {
    const link = event.target.closest("[data-analytics-keyword], a");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    const keyword = link.getAttribute("data-analytics-keyword") || inferKeyword(href, link.textContent || "");
    const areaNode = link.closest("[data-analytics-area]");
    track("link_click", {
      link_id: link.getAttribute("data-analytics-link-id") || "",
      link_url: href,
      link_text: (link.textContent || "").trim().slice(0, 180),
      keyword,
      keyword_id: normalizeKeywordId(keyword),
      area: link.getAttribute("data-analytics-area") || (areaNode ? areaNode.getAttribute("data-analytics-area") : "")
    });
  });

  window.DocROITrack = track;
  track("page_view");
})();
