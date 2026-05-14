function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function getActiveTerms() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Falta configurar Supabase.");
  }

  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
  const response = await fetch(
    `${supabaseUrl}/rest/v1/terms_versions?select=version,title,content,effective_from&active=eq.true&order=effective_from.desc&limit=1`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  );

  const payload = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(payload?.message || "No se pudieron cargar los términos.");
  }

  return payload[0] || null;
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    const terms = await getActiveTerms();

    if (!terms) {
      return res.status(404).json({ error: "No hay términos activos." });
    }

    return res.status(200).json({ terms });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Error cargando términos." });
  }
};
