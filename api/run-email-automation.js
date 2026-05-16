const { runDueAutomation } = require("./lib/email-automation");

function isAuthorized(req) {
  if (!process.env.CRON_SECRET) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = req.headers.authorization || "";
  const headerSecret = req.headers["x-cron-secret"] || "";

  return authorization === `Bearer ${process.env.CRON_SECRET}` || headerSecret === process.env.CRON_SECRET;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Metodo no permitido." });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "No autorizado." });
  }

  try {
    const result = await runDueAutomation({ req });
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || "Error ejecutando la automatización." });
  }
};
