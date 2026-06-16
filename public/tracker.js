(function () {
  const config = window.DocROIAnalytics || {};
  const endpoint = config.endpoint || "/api/track";
  const appName = (config.appName || config.sourceSite || location.hostname || "unknown").toLowerCase();
  const prefix = "docroi_analytics_";
  const sessionTimeoutMs = 30 * 60 * 1000;
  const visitId = uid("visit");
  const startedAt = Date.now();
  let totalActiveSeconds = 0;
  let currentSectionId = "";
  let lastContentId = "";
  const scrollDepths = new Set();
  const seenSections = new Set();
  const seenContent = new Set();

  function uid(label) {
    if (crypto && crypto.randomUUID) return `${label}_${crypto.randomUUID()}`;
    return `${label}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  }

  function safeGet(store, key) { try { return store.getItem(key); } catch { return ""; } }
  function safeSet(store, key, value) { try { store.setItem(key, value); } catch {} }

  function getBrowserId() {
    const key = `${prefix}browser_id`;
    let value = safeGet(localStorage, key);
    if (!value) {
      value = uid("br");
      safeSet(localStorage, key, value);
      safeSet(localStorage, `${prefix}first_seen`, new Date().toISOString());
      safeSet(localStorage, `${prefix}first_touch_url`, location.href);
      safeSet(localStorage, `${prefix}first_touch_utm`, JSON.stringify(getUtmFromUrl()));
    }
    safeSet(localStorage, `${prefix}last_seen`, new Date().toISOString());
    safeSet(localStorage, `${prefix}last_touch_url`, location.href);
    safeSet(localStorage, `${prefix}last_touch_utm`, JSON.stringify(getUtm()));
    return value;
  }

  function getSessionId() {
    const now = Date.now();
    const last = Number(safeGet(localStorage, `${prefix}last_activity`) || 0);
    let session = safeGet(sessionStorage, `${prefix}session_id`);
    if (!session || now - last > sessionTimeoutMs) {
      session = uid("ss");
      safeSet(sessionStorage, `${prefix}session_id`, session);
    }
    safeSet(localStorage, `${prefix}last_activity`, String(now));
    return session;
  }

  function getUtmFromUrl() {
    const params = new URLSearchParams(location.search);
    return {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_content: params.get("utm_content") || "",
      utm_term: params.get("utm_term") || "",
      campaign_keyword: params.get("campaign_keyword") || params.get("keyword") || ""
    };
  }

  function getUtm() {
    const utm = getUtmFromUrl();
    if (Object.values(utm).some(Boolean)) {
      safeSet(localStorage, `${prefix}utm`, JSON.stringify(utm));
      return utm;
    }
    try { return JSON.parse(safeGet(localStorage, `${prefix}utm`) || "{}"); }
    catch { return utm; }
  }

  function deviceType() {
    const width = window.innerWidth || document.documentElement.clientWidth;
    if (width < 768) return "mobile";
    if (width < 1100) return "tablet";
    return "desktop";
  }

  function browserName() {
    const ua = navigator.userAgent || "";
    if (ua.includes("Edg/")) return "Edge";
    if (ua.includes("Chrome/")) return "Chrome";
    if (ua.includes("Firefox/")) return "Firefox";
    if (ua.includes("Safari/")) return "Safari";
    return "Other";
  }

  function osName() {
    const ua = navigator.userAgent || "";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac OS")) return "macOS";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    return "Other";
  }

  function hashUserAgent() {
    const text = navigator.userAgent || "";
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return String(Math.abs(hash));
  }

  function keywordId(keyword) {
    if (!keyword) return "";
    return "KW_" + keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toUpperCase();
  }

  function inferKeyword(value) {
    const text = String(value || "").toLowerCase();
    if (text.includes("pildora") || text.includes("píldora")) return "Pildora";
    if (text.includes("vitamina")) return "Vitamina";
    if (text.includes("medicina")) return "Medicina";
    if (text.includes("kai")) return "Ecuacion KAI";
    if (text.includes("executive")) return "Executive";
    if (text.includes("diagnost")) return "Diagnostico";
    if (text.includes("consulta")) return "Consulta";
    if (text.includes("incompany")) return "Incompany";
    if (text.includes("formacion") || text.includes("formación")) return "Formacion";
    return appName.includes("botiquin") ? "Botiquin" : "Executive";
  }

  function base(type) {
    return {
      event_id: uid("evt"),
      timestamp: new Date().toISOString(),
      event_ts: new Date().toISOString(),
      event_date: new Date().toISOString().slice(0, 10),
      app_name: appName,
      source_app: appName,
      browser_id: getBrowserId(),
      session_id: getSessionId(),
      visit_id: visitId,
      event_type: type,
      page_url: location.href,
      page_path: location.pathname,
      page_title: document.title || "",
      referrer: document.referrer || "",
      device_type: deviceType(),
      browser_name: browserName(),
      operating_system: osName(),
      screen_width: String(screen.width || ""),
      screen_height: String(screen.height || ""),
      language: navigator.language || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      user_agent_hash: hashUserAgent(),
      consent_status: window.DocROIConsentStatus || "unknown",
      ...getUtm()
    };
  }

  function queue(event) {
    try {
      const key = `${prefix}queue`;
      const rows = JSON.parse(localStorage.getItem(key) || "[]");
      rows.push(event);
      localStorage.setItem(key, JSON.stringify(rows.slice(-200)));
    } catch {}
  }

  function flushQueue() {
    try {
      const key = `${prefix}queue`;
      const rows = JSON.parse(localStorage.getItem(key) || "[]");
      if (!rows.length) return;
      localStorage.removeItem(key);
      rows.forEach(send);
    } catch {}
  }

  function send(event) {
    const body = JSON.stringify(event);
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      if (!ok) queue(event);
      return;
    }
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => queue(event));
  }

  function track(type, extra) {
    const event = { ...base(type), ...(extra || {}) };
    if (event.keyword && !event.keyword_id) event.keyword_id = keywordId(event.keyword);
    send(event);
    return event;
  }

  function destinationType(url) {
    try {
      const parsed = new URL(url, location.href);
      if (parsed.hostname.includes("doc-roi-executive")) return "executive";
      if (parsed.hostname !== location.hostname) return "external";
      return "internal";
    } catch { return "unknown"; }
  }

  function bindClicks() {
    document.addEventListener("click", function (event) {
      const node = event.target.closest("[data-track-button-id], [data-analytics-keyword], a, button");
      if (!node) return;
      const href = node.getAttribute("href") || "";
      const keyword = node.dataset.trackKeyword || node.dataset.analyticsKeyword || inferKeyword(`${href} ${node.textContent}`);
      const payload = {
        button_id: node.dataset.trackButtonId || node.dataset.analyticsLinkId || node.id || "",
        button_text: (node.textContent || "").trim().slice(0, 180),
        button_keyword: keyword,
        keyword,
        keyword_id: keywordId(keyword),
        button_group: node.dataset.trackButtonGroup || "",
        destination_url: href,
        destination_domain: href ? new URL(href, location.href).hostname : "",
        destination_type: node.dataset.trackDestinationType || destinationType(href),
        section_id: node.dataset.trackSection || node.dataset.analyticsArea || currentSectionId,
        content_id: node.dataset.trackContentId || "",
        content_type: node.dataset.trackContentType || "",
        content_title: node.dataset.trackContentTitle || ""
      };
      track("button_click", payload);
      if (payload.destination_type === "external" || payload.destination_type === "executive") track("outbound_click", payload);
    }, true);
  }

  function observeSections() {
    const sections = document.querySelectorAll("section, header, footer, nav, aside, [data-track-section]");
    if (!sections.length || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const section = entry.target;
        const sectionId = section.dataset.trackSection || section.id || section.getAttribute("aria-label") || section.className || "section";
        currentSectionId = String(sectionId).slice(0, 100);
        if (seenSections.has(currentSectionId)) return;
        seenSections.add(currentSectionId);
        track("section_view", {
          section_id: currentSectionId,
          section_name: section.getAttribute("aria-label") || section.querySelector("h1,h2,h3")?.textContent || currentSectionId,
          visible_percent: Math.round(entry.intersectionRatio * 100),
          time_to_view_seconds: Math.round((Date.now() - startedAt) / 1000)
        });
      });
    }, { threshold: [0.35, 0.6] });
    sections.forEach((section, index) => { section.dataset.sectionOrder = String(index + 1); observer.observe(section); });
  }

  function observeContent() {
    const cards = document.querySelectorAll("[data-track-content-id], article, .docroi-resource-card, .service-card");
    if (!cards.length || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.45) return;
        const card = entry.target;
        const contentId = card.dataset.trackContentId || card.querySelector("h3")?.textContent?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "content";
        if (seenContent.has(contentId)) return;
        seenContent.add(contentId);
        lastContentId = contentId;
        const title = card.dataset.trackContentTitle || card.querySelector("h3,h2")?.textContent || "";
        const keyword = card.dataset.trackKeyword || inferKeyword(title);
        track("content_impression", {
          content_id: contentId,
          content_title: title,
          content_type: card.dataset.trackContentType || inferKeyword(card.textContent).toLowerCase().replace(/\s+/g, "_"),
          content_status: card.dataset.trackContentStatus || card.querySelector(".docroi-status")?.textContent || "",
          content_keyword: keyword,
          keyword,
          keyword_id: keywordId(keyword),
          section_id: card.dataset.trackSection || currentSectionId
        });
      });
    }, { threshold: [0.45] });
    cards.forEach((card, index) => { card.dataset.cardPosition = String(index + 1); observer.observe(card); });
  }

  function bindScrollDepth() {
    window.addEventListener("scroll", function () {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const percent = Math.min(100, Math.round((window.scrollY / max) * 100));
      [25, 50, 75, 90, 100].forEach((mark) => {
        if (percent >= mark && !scrollDepths.has(mark)) {
          scrollDepths.add(mark);
          track("scroll_depth", { depth_percent: mark, max_scroll_percent: percent });
        }
      });
    }, { passive: true });
  }

  function bindForms() {
    document.querySelectorAll("form").forEach((form) => {
      const formType = form.dataset.formKind || form.dataset.formType || form.id || "form";
      track("form_view", { form_id: form.id || formType, form_type: formType, form_title: form.querySelector("h3,h2")?.textContent || formType, section_id: currentSectionId });
      let started = false;
      form.addEventListener("input", (event) => {
        const field = event.target;
        if (!started) {
          started = true;
          track("form_start", { form_id: form.id || formType, form_type: formType, first_field_name: field.name || field.id || "" });
        }
        track("form_field_interaction", { form_id: form.id || formType, form_type: formType, field_name: field.name || field.id || "", field_type: field.type || field.tagName, interacted: true });
      }, true);
    });
  }

  function engagement() {
    setInterval(() => {
      if (document.hidden) return;
      totalActiveSeconds += 15;
      track("engagement_time", { active_seconds: 15, total_active_seconds: totalActiveSeconds, section_id: currentSectionId, last_content_id: lastContentId });
    }, 15000);
  }

  window.DocROITrack = track;
  flushQueue();
  track("page_view");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { bindClicks(); observeSections(); observeContent(); bindScrollDepth(); bindForms(); engagement(); });
  } else {
    bindClicks(); observeSections(); observeContent(); bindScrollDepth(); bindForms(); engagement();
  }
})();
