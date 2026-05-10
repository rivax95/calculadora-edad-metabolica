const RESEND_API_URL = "https://api.resend.com/emails";

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value) || 0);
}

function buildResultEmail(data, result) {
  const name = escapeHtml(data.fullName);
  const phone = data.phone ? escapeHtml(data.phone) : "No indicado";
  const email = escapeHtml(data.email);
  const metabolicAge = escapeHtml(result.metabolicAge);
  const realAge = escapeHtml(data.age);
  const badge = escapeHtml(result.copy?.badge || "Resultado");
  const title = escapeHtml(result.copy?.title || "Tu edad metabolica");
  const text = escapeHtml(result.copy?.text || "Este resultado es una estimacion orientativa.");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Resultado de edad metabolica</title>
  </head>
  <body style="margin:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#151515;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f1f1;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e4e4e4;">
            <tr>
              <td style="padding:34px 30px 18px;text-align:center;">
                <div style="display:inline-block;background:#111;color:#fff;font-weight:900;text-transform:uppercase;padding:6px 12px;border-radius:4px;font-size:12px;">${badge}</div>
                <h1 style="margin:18px 0 8px;font-size:38px;line-height:0.95;text-transform:uppercase;">Resultado de edad metabolica</h1>
                <p style="margin:0;color:#6d6d6d;font-size:16px;font-weight:700;">Hola ${name}, este es el resumen de tu calculadora.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 30px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f7;border-radius:18px;border:1px solid #e8e8e8;">
                  <tr>
                    <td style="padding:26px;text-align:center;">
                      <div style="color:#777;font-size:12px;font-weight:900;text-transform:uppercase;">Edad metabolica estimada</div>
                      <div style="font-size:82px;line-height:0.9;font-weight:900;margin-top:8px;">${metabolicAge}<span style="font-size:18px;color:#777;margin-left:8px;">anos</span></div>
                      <div style="margin-top:12px;color:#777;font-weight:800;">Edad cronologica: ${realAge} anos</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 24px;">
                <h2 style="margin:0 0 8px;font-size:26px;line-height:1;">${title}</h2>
                <p style="margin:0;color:#686868;font-weight:700;line-height:1.55;">${text}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:33.33%;padding:8px;">
                      <div style="border:1px solid #e6e6e6;border-radius:14px;padding:16px;background:#fff;">
                        <div style="color:#777;font-size:12px;font-weight:900;">Metabolismo basal</div>
                        <div style="font-size:24px;font-weight:900;margin-top:8px;">${formatNumber(result.bmr)} kcal</div>
                      </div>
                    </td>
                    <td style="width:33.33%;padding:8px;">
                      <div style="border:1px solid #e6e6e6;border-radius:14px;padding:16px;background:#fff;">
                        <div style="color:#777;font-size:12px;font-weight:900;">IMC</div>
                        <div style="font-size:24px;font-weight:900;margin-top:8px;">${formatNumber(result.bmi, 1)}</div>
                      </div>
                    </td>
                    <td style="width:33.33%;padding:8px;">
                      <div style="border:1px solid #e6e6e6;border-radius:14px;padding:16px;background:#fff;">
                        <div style="color:#777;font-size:12px;font-weight:900;">Actividad</div>
                        <div style="font-size:24px;font-weight:900;margin-top:8px;">${escapeHtml(result.activityLabel)}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px;background:#111;color:#fff;">
                <div style="font-weight:900;margin-bottom:8px;">Datos de contacto</div>
                <div style="color:#d9d9d9;line-height:1.55;">Nombre: ${name}<br>Email: ${email}<br>Telefono: ${phone}</div>
              </td>
            </tr>
          </table>
          <p style="max-width:680px;margin:16px auto 0;color:#777;font-size:12px;line-height:1.5;">
            Este correo contiene una estimacion orientativa y no sustituye una valoracion profesional.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo no permitido." });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "Falta configurar RESEND_API_KEY." });
  }

  try {
    const { data, result } = parseBody(req);

    if (!data?.email || !data?.fullName || !result?.metabolicAge) {
      return res.status(400).json({ error: "Faltan datos para enviar el resultado." });
    }

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Calculadora <onboarding@resend.dev>",
        to: [data.email],
        subject: "Tu resultado de edad metabolica",
        html: buildResultEmail(data, result),
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.message || "Resend no pudo enviar el correo.",
      });
    }

    return res.status(200).json({ ok: true, id: payload.id });
  } catch (error) {
    return res.status(500).json({ error: "Error inesperado enviando el correo." });
  }
};
