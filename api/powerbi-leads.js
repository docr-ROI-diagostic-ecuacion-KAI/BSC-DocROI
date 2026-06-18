const { listSubmissions } = require("./_lib/storage.js");
const { leadsTable } = require("./_lib/metrics.js");
function today(){return new Date().toISOString().slice(0,10)}
function from(req){return req.query.date_from||process.env.CAMPAIGN_START_DATE||"2026-06-17"}
function to(req){return req.query.date_to||today()}
function esc(v){const s=String(v??"");return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function csv(rows,headers){return [headers.join(","),...rows.map(r=>headers.map(h=>esc(r[h])).join(","))].join("\n")+"\n"}
const headers=["timestamp","form_type","urgent","institution_company","contact_name","role","email","phone","demand_type","need","modality","language","utm_source","utm_campaign","previous_keywords","browser_id","lead_score","lead_status","recommended_next_action"];
module.exports=async function handler(req,res){try{const rows=leadsTable(await listSubmissions(from(req),to(req)));res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Cache-Control","no-store, max-age=0");res.status(200).send(csv(rows,headers))}catch(e){res.status(500).send("error\npowerbi_leads_failed\n")}};