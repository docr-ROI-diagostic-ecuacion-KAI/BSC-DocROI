const { hasStorage } = require("./_lib/storage.js");
module.exports = async function handler(req,res){res.status(200).json({ok:true,service:"docroi-analytics",storage_ready:hasStorage(),campaign_start:process.env.CAMPAIGN_START_DATE||"2026-06-16",generated_at:new Date().toISOString()})};
