const { listEvents, listSubmissions } = require("../_lib/storage.js");
const { cohorts } = require("../_lib/metrics.js");
function today(){return new Date().toISOString().slice(0,10)}
module.exports = async function handler(req,res){try{const dateFrom=req.query.date_from||process.env.CAMPAIGN_START_DATE||"2026-06-16";const dateTo=req.query.date_to||today();let rows=cohorts(await listEvents(dateFrom,dateTo),await listSubmissions(dateFrom,dateTo));if(req.query.keyword) rows=rows.filter(r=>r.keyword===req.query.keyword);res.status(200).json({ok:true,date_from:dateFrom,date_to:dateTo,rows})}catch(e){res.status(500).json({ok:false,error:"cohorts_failed"})}};
