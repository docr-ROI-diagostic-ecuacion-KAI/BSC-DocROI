const { listEvents, listSubmissions } = require("../_lib/storage.js");
const { journey } = require("../_lib/metrics.js");
function today(){return new Date().toISOString().slice(0,10)}
module.exports = async function handler(req,res){try{const browserId=req.query.browser_id;if(!browserId)return res.status(400).json({ok:false,error:"browser_id_required"});const dateFrom=req.query.date_from||"2026-06-16";const dateTo=req.query.date_to||today();const data=journey(await listEvents(dateFrom,dateTo),await listSubmissions(dateFrom,dateTo),browserId);res.status(200).json({ok:true,date_from:dateFrom,date_to:dateTo,journey:data})}catch(e){res.status(500).json({ok:false,error:"journey_failed"})}};
