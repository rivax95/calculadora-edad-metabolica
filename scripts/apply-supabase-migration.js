const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const MIGRATION_PATH = path.join(ROOT, "database", "add-terms-version.sql");

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return;

  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    process.env[key.trim()] ||= rest.join("=").trim();
  }
}

function getProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  if (!process.env.SUPABASE_URL) {
    throw new Error("Falta SUPABASE_URL o SUPABASE_PROJECT_REF.");
  }

  return new URL(process.env.SUPABASE_URL).hostname.split(".")[0];
}

async function applyMigration() {
  loadEnv();

  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    throw new Error("Falta SUPABASE_ACCESS_TOKEN. Crea un Personal Access Token en Supabase y anadelo al .env.");
  }

  const projectRef = getProjectRef();
  const query = fs.readFileSync(MIGRATION_PATH, "utf8");
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Supabase respondio con HTTP ${response.status}.`);
  }

  console.log(`Migracion aplicada en Supabase (${projectRef}).`);
}

applyMigration().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
