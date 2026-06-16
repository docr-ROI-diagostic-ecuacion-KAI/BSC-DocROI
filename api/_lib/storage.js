const DEFAULT_OWNER = "docr-ROI-diagostic-ecuacion-KAI";
const DEFAULT_REPO = "BSC-DocROI";
const DEFAULT_BRANCH = "main";
const DEFAULT_DATA_PATH = "data";

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

function config() {
  return {
    token: env("GITHUB_TOKEN"),
    owner: env("GITHUB_OWNER", DEFAULT_OWNER),
    repo: env("GITHUB_REPO", DEFAULT_REPO),
    branch: env("GITHUB_BRANCH", DEFAULT_BRANCH),
    dataPath: env("GITHUB_DATA_PATH", DEFAULT_DATA_PATH)
  };
}

function hasStorage() {
  return Boolean(config().token);
}

function githubHeaders() {
  const { token } = config();
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
}

function apiUrl(path) {
  const { owner, repo } = config();
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
}

function b64Encode(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function b64Decode(text) {
  return Buffer.from(text || "", "base64").toString("utf8");
}

async function readFile(path) {
  if (!hasStorage()) return { exists: false, content: "", sha: null };
  const { branch } = config();
  const response = await fetch(`${apiUrl(path)}?ref=${encodeURIComponent(branch)}`, { headers: githubHeaders() });
  if (response.status === 404) return { exists: false, content: "", sha: null };
  if (!response.ok) throw new Error(`GitHub read failed ${response.status}`);
  const data = await response.json();
  return { exists: true, content: b64Decode(data.content), sha: data.sha };
}

async function writeFile(path, content, sha, message) {
  const { branch } = config();
  const body = { message, content: b64Encode(content), branch };
  if (sha) body.sha = sha;
  const response = await fetch(apiUrl(path), {
    method: "PUT",
    headers: githubHeaders(),
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub write failed ${response.status}: ${text}`);
  }
  return response.json();
}

function parseLines(content) {
  return content.split(/\r?\n/).filter(Boolean).map((line) => {
    try { return JSON.parse(line); }
    catch { return null; }
  }).filter(Boolean);
}

async function appendNdjson(path, record, uniqueKey) {
  if (!hasStorage()) return { ok: true, mode: "accepted_without_storage" };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await readFile(path);
    const rows = parseLines(current.content);
    if (uniqueKey && record[uniqueKey] && rows.some((row) => row[uniqueKey] === record[uniqueKey])) {
      return { ok: true, mode: "duplicate_ignored", path };
    }
    const next = `${current.content || ""}${current.content && !current.content.endsWith("\n") ? "\n" : ""}${JSON.stringify(record)}\n`;
    try {
      await writeFile(path, next, current.sha, `Append Doc ROI data ${path}`);
      return { ok: true, mode: "stored", path };
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  return { ok: false, mode: "failed", path };
}

function dateFromIso(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function monthFromIso(value) {
  return dateFromIso(value).slice(0, 7);
}

function dateRange(from, to) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  const days = [];
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function monthRange(from, to) {
  const months = new Set(dateRange(from, to).map((day) => day.slice(0, 7)));
  return [...months];
}

function eventPath(date) {
  const { dataPath } = config();
  return `${dataPath}/events/${date}.ndjson`;
}

function submissionPath(month) {
  const { dataPath } = config();
  return `${dataPath}/submissions/${month}.ndjson`;
}

async function appendEvent(event) {
  const date = event.event_date || dateFromIso(event.timestamp || event.event_ts);
  return appendNdjson(eventPath(date), event, "event_id");
}

async function appendSubmission(submission) {
  const month = monthFromIso(submission.timestamp || submission.created_ts);
  return appendNdjson(submissionPath(month), submission, "submission_id");
}

async function listEvents(dateFrom, dateTo) {
  if (!hasStorage()) return [];
  const rows = [];
  for (const day of dateRange(dateFrom, dateTo)) {
    const file = await readFile(eventPath(day));
    if (file.exists) rows.push(...parseLines(file.content));
  }
  return rows;
}

async function listSubmissions(dateFrom, dateTo) {
  if (!hasStorage()) return [];
  const rows = [];
  for (const month of monthRange(dateFrom, dateTo)) {
    const file = await readFile(submissionPath(month));
    if (file.exists) rows.push(...parseLines(file.content));
  }
  return rows.filter((row) => {
    const day = dateFromIso(row.timestamp || row.created_ts);
    return day >= dateFrom && day <= dateTo;
  });
}

module.exports = {
  hasStorage,
  appendEvent,
  appendSubmission,
  listEvents,
  listSubmissions,
  dateFromIso
};
