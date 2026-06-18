const SHEET_ID = "1uDRdmSLUv9SkL8vifgEReVKkTrBQ6obfthTuQKH4Q3U";
const GIDS = {
  events: "1668419814",
  leads: "1906949458"
};

module.exports = async function handler(req, res) {
  try {
    const tab = String(req.query.tab || "events").toLowerCase();
    const gid = GIDS[tab];
    if (!gid) return res.status(400).send("error\nunknown_tab\n");

    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    const response = await fetch(url, { headers: { "User-Agent": "DocROI-Dashboard/1.0" } });
    if (!response.ok) {
      return res.status(response.status).send(`error\ngoogle_sheet_${response.status}\n`);
    }

    const csv = await response.text();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).send("error\ngoogle_sheet_proxy_failed\n");
  }
};