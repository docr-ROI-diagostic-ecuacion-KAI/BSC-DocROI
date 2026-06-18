const { listEvents, listSubmissions } = require("./_lib/storage.js");
const { summarize } = require("./_lib/metrics.js");
function today(){return new Date().toISOString().slice(0,10)}
function from(req){return req.query.date_from||process.env.CAMPAIGN_START_DATE||"2026-06-17"}
function to(req){return req.query.date_to||today()}
function esc(v){const s=String(v??"");return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function csv(rows,headers){return [headers.join(","),...rows.map(r=>headers.map(h=>esc(r[h])).join(","))].join("\n")+"\n"}
const headers=["date_from","date_to","generated_at","botiquin_visits","botiquin_browsers","botiquin_sessions","botiquin_clicks","botiquin_impressions","botiquin_ctr","executive_visits","executive_browsers","executive_sessions","form_starts","form_submits","urgent_submissions","urgent_percent","botiquin_to_executive","botiquin_to_executive_rate","total_events","capture_ready","excel_webhook_ready"];
module.exports=async function handler(req,res){try{const f=from(req),t=to(req);const row={date_from:f,date_to:t,generated_at:new Date().toISOString(),...summarize(await listEvents(f,t),await listSubmissions(f,t))};res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Cache-Control","no-store, max-age=0");res.status(200).send(csv([row],headers))}catch(e){res.status(500).send("error\npowerbi_summary_failed\n")}};