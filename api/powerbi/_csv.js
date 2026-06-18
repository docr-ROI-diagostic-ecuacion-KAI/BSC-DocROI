function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateFrom(req) {
  return req.query.date_from || process.env.CAMPAIGN_START_DATE || "2026-06-17";
}

function dateTo(req) {
  return req.query.date_to || today();
}

function esc(value) {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function flatten(value) {
  if (Array.isArray(value)) return value.join(" | ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return value;
}

function csv(rows, fallbackHeaders = []) {
  const headers = rows.length ? Object.keys(rows[0]) : fallbackHeaders;
  if (!headers.length) return "status\nempty\n";
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => esc(flatten(row[header]))).join(","))
  ].join("\n") + "\n";
}

function sendCsv(res, name, rows, fallbackHeaders) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Disposition", `inline; filename=${name}.csv`);
  res.status(200).send(csv(rows, fallbackHeaders));
}

module.exports = { dateFrom, dateTo, sendCsv };