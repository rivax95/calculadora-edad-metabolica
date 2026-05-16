const RESEND_API_URL = "https://api.resend.com/emails";
const SUPABASE_TABLE = "metabolic_results";
const WHATSAPP_PHONE = "34623243958";

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
  const email = escapeHtml(data.email);
  const metabolicAge = escapeHtml(result.metabolicAge);
  const realAge = escapeHtml(data.age);
  const badge = escapeHtml(result.copy?.badge || "Resultado");
  const title = escapeHtml(result.copy?.title || "Tu edad metabólica");
  const text = escapeHtml(result.copy?.text || "Este resultado es una estimación orientativa.");
  const whatsappMessage = encodeURIComponent(
    `Hola, soy ${data.fullName}. He recibido mi resultado de edad metabólica (${result.metabolicAge} años) y quiero saber por dónde empezar.`,
  );
  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${whatsappMessage}`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Resultado de edad metabólica</title>
  </head>
  <body style="margin:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#151515;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f1f1;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e4e4e4;">
            <tr>
              <td style="padding:34px 30px 18px;text-align:center;">
                <div style="display:inline-block;background:#111;color:#fff;font-weight:900;text-transform:uppercase;padding:6px 12px;border-radius:4px;font-size:12px;">${badge}</div>
                <h1 style="margin:18px 0 8px;font-size:38px;line-height:0.95;text-transform:uppercase;">Resultado de edad metabólica</h1>
                <p style="margin:0;color:#6d6d6d;font-size:16px;font-weight:700;">Hola ${name}, este es el resumen de tu calculadora.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 30px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f7;border-radius:18px;border:1px solid #e8e8e8;">
                  <tr>
                    <td style="padding:26px;text-align:center;">
                      <div style="color:#777;font-size:12px;font-weight:900;text-transform:uppercase;">Edad metabólica estimada</div>
                      <div style="font-size:82px;line-height:0.9;font-weight:900;margin-top:8px;">${metabolicAge}<span style="font-size:18px;color:#777;margin-left:8px;">años</span></div>
                      <div style="margin-top:12px;color:#777;font-weight:800;">Edad cronológica: ${realAge} años</div>
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
              <td style="padding:30px;background:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e6e6e6;border-radius:20px;background:#f7f7f7;">
                  <tr>
                    <td style="padding:26px;text-align:center;">
                      <h2 style="margin:0 0 12px;font-size:30px;line-height:1;font-weight:900;">¿Por dónde puedo empezar?</h2>
                      <p style="margin:0 auto 22px;max-width:460px;color:#686868;font-weight:700;line-height:1.55;">
                        Pregunta directamente por nuestros planes. Te ayudaremos a entender tu resultado y dar el siguiente paso.
                      </p>
                      <a href="${whatsappUrl}" style="display:inline-block;background:#ffffff;color:#4f4f4f;border-radius:14px;padding:16px 24px;text-decoration:none;font-weight:900;text-transform:uppercase;box-shadow:0 10px 24px rgba(0,0,0,0.12);">
                        Hablar por WhatsApp
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="max-width:680px;margin:16px auto 0;color:#777;font-size:12px;line-height:1.5;">
            Este correo contiene una estimación orientativa y no sustituye una valoración profesional.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildDatabaseRecord(data, result, emailMeta = {}) {
  return {
    full_name: data.fullName,
    email: data.email,
    phone: data.phone || null,
    sex: data.sex,
    chronological_age: Number(data.age),
    weight_kg: Number(data.weight),
    height_cm: Number(data.height),
    activity: data.activity,
    energy_level: data.energyLevel || "stable",
    sleep_quality: data.sleepQuality || "normal",
    stress_anxiety: data.stressAnxiety || "no",
    metabolic_age: Number(result.metabolicAge),
    age_delta: Number(result.delta),
    bmr: Number(result.bmr),
    bmi: Number(result.bmi),
    tdee: Number(result.tdee),
    water_l: Number(result.water),
    body_score: Number(result.bodyScore),
    activity_score: Number(result.activityScore),
    vitality_score: Number(result.vitalityScore),
    result_badge: result.copy?.badge || "Resultado",
    result_title: result.copy?.title || "Tu edad metabólica",
    result_text: result.copy?.text || "Resultado orientativo.",
    consent_accepted: true,
    terms_version: data.termsVersion || "2026-05-14-v1",
    email_sent: Boolean(emailMeta.emailSent),
    resend_email_id: emailMeta.resendEmailId || null,
    email_error: emailMeta.emailError || null,
    user_agent: data.userAgent || null,
  };
}

async function saveToSupabase(record) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Falta configurar SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
  const response = await fetch(`${supabaseUrl}/rest/v1/${SUPABASE_TABLE}`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || payload?.hint || "No se pudo guardar en Supabase.";
    throw new Error(message);
  }

  return Array.isArray(payload) ? payload[0] : payload;
}

async function sendResultEmail(data, result) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Falta configurar RESEND_API_KEY.");
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
        subject: "Tu resultado de edad metabólica",
      html: buildResultEmail(data, result),
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || "Resend no pudo enviar el correo.");
  }

  return payload;
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

  try {
    const { data, result } = parseBody(req);

    if (!data?.email || !data?.fullName || !data?.termsVersion || !result?.metabolicAge) {
      return res.status(400).json({ error: "Faltan datos para enviar el resultado." });
    }

    const enrichedData = {
      ...data,
      userAgent: req.headers["user-agent"] || null,
    };

    let emailMeta = { emailSent: false };
    let emailError = null;

    try {
      const emailPayload = await sendResultEmail(enrichedData, result);
      emailMeta = {
        emailSent: true,
        resendEmailId: emailPayload.id,
      };
    } catch (error) {
      emailError = error.message;
      emailMeta = {
        emailSent: false,
        emailError,
      };
    }

    const savedRecord = await saveToSupabase(buildDatabaseRecord(enrichedData, result, emailMeta));

    if (emailError) {
      return res.status(502).json({
        ok: false,
        saved: true,
        id: savedRecord?.id,
        error: emailError,
      });
    }

    return res.status(200).json({
      ok: true,
      saved: true,
      id: savedRecord?.id,
      emailId: emailMeta.resendEmailId,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Error inesperado guardando el resultado." });
  }
};
