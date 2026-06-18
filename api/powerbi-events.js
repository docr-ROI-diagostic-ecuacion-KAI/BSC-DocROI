const { listEvents } = require("./_lib/storage.js");
function today(){return new Date().toISOString().slice(0,10)}
function from(req){return req.query.date_from||process.env.CAMPAIGN_START_DATE||"2026-06-17"}
function to(req){return req.query.date_to||today()}
function esc(v){const s=String(v??"");return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function flat(v){if(Array.isArray(v))return v.join(" | ");if(v&&typeof v==="object")return JSON.stringify(v);return v}
function csv(rows,headers){return [headers.join(","),...rows.map(r=>headers.map(h=>esc(flat(r[h]))).join(","))].join("\n")+"\n"}
const headers=["event_id","timestamp","event_date","app_name","event_type","browser_id","session_id","visit_id","page_url","page_path","page_title","referrer","keyword","keyword_id","button_id","button_text","button_keyword","section_id","section_name","content_id","content_title","content_type","destination_url","destination_domain","destination_type","utm_source","utm_medium","utm_campaign","utm_content","utm_term","device_type","browser_name","operating_system","screen_width","screen_height","language","timezone","depth_percent","active_seconds","total_active_seconds"];
module.exports=async function handler(req,res){try{const rows=await listEvents(from(req),to(req));res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Cache-Control","no-store, max-age=0");res.status(200).send(csv(rows,headers))}catch(e){res.status(500).send("error\npowerbi_events_failed\n")}};