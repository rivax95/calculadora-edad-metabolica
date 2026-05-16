const { escapeHtml } = require("./lib/server-utils");
const { getAutomationText } = require("./lib/automation-config");
const { unsubscribeByToken } = require("./lib/email-automation");

function renderPage({ title, text }) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#151515;display:grid;min-height:100vh;place-items:center;padding:24px;">
    <main style="max-width:560px;background:#fff;border:1px solid #e4e4e4;border-radius:22px;padding:34px;text-align:center;">
      <h1 style="margin:0 0 12px;font-size:32px;line-height:1;">${escapeHtml(title)}</h1>
      <p style="margin:0;color:#666;font-weight:700;line-height:1.55;">${escapeHtml(text)}</p>
    </main>
  </body>
</html>`;
}

function sendHtml(res, statusCode, html) {
  res.status(statusCode);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Metodo no permitido.");
  }

  const token = req.query?.token || new URL(req.url, "https://local.invalid").searchParams.get("token");

  if (!token) {
    return sendHtml(
      res,
      400,
      renderPage({
        title: getAutomationText("unsubscribeErrorTitle", "No pudimos confirmar la baja"),
        text: getAutomationText("unsubscribeErrorText", "El enlace no es válido o ya ha caducado."),
      }),
    );
  }

  try {
    const result = await unsubscribeByToken(token);

    if (!result.ok) {
      return sendHtml(
        res,
        404,
        renderPage({
          title: getAutomationText("unsubscribeErrorTitle", "No pudimos confirmar la baja"),
          text: getAutomationText("unsubscribeErrorText", "El enlace no es válido o ya ha caducado."),
        }),
      );
    }

    return sendHtml(
      res,
      200,
      renderPage({
        title: getAutomationText("unsubscribeSuccessTitle", "Baja confirmada"),
        text: getAutomationText("unsubscribeSuccessText", "Ya no recibirás más correos de esta secuencia."),
      }),
    );
  } catch (error) {
    return sendHtml(
      res,
      500,
      renderPage({
        title: getAutomationText("unsubscribeErrorTitle", "No pudimos confirmar la baja"),
        text: error.message || getAutomationText("unsubscribeErrorText", "El enlace no es válido o ya ha caducado."),
      }),
    );
  }
};
