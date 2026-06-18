const { listEvents, listSubmissions } = require("./_lib/storage.js");
const { keywordRows } = require("./_lib/metrics.js");
function today(){return new Date().toISOString().slice(0,10)}
function from(req){return req.query.date_from||process.env.CAMPAIGN_START_DATE||"2026-06-17"}
function to(req){return req.query.date_to||today()}
function esc(v){const s=String(v??"");return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function csv(rows,headers){return [headers.join(","),...rows.map(r=>headers.map(h=>esc(r[h])).join(","))].join("\n")+"\n"}
const headers=["keyword","browsers","sessions","visits","impressions","clicks","ctr","frequency_per_browser","conversions_to_executive"];
module.exports=async function handler(req,res){try{const f=from(req),t=to(req);const rows=keywordRows(await listEvents(f,t),await listSubmissions(f,t));res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Cache-Control","no-store, max-age=0");res.status(200).send(csv(rows,headers))}catch(e){res.status(500).send("error\npowerbi_keywords_failed\n")}};