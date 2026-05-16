const CONTENT = require("../../content.json");

const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getContent(path, fallback) {
  const value = path.split(".").reduce((current, key) => current?.[key], CONTENT);
  return value ?? fallback;
}

function formatTemplate(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function getBaseUrl(req) {
  const configured = process.env.PUBLIC_BASE_URL || process.env.ALLOWED_ORIGIN;

  if (configured && configured !== "*") {
    return configured.replace(/\/$/, "");
  }

  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  const protocol = req?.headers?.["x-forwarded-proto"] || "https";

  return host ? `${protocol}://${host}` : "";
}

function getSupabaseUrl() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Falta configurar SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  return process.env.SUPABASE_URL.replace(/\/$/, "");
}

async function supabaseRequest(path, { method = "GET", body, prefer, headers = {} } = {}) {
  const response = await fetch(`${getSupabaseUrl()}${path}`, {
    method,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || payload?.hint || "Error consultando Supabase.";
    throw new Error(message);
  }

  return payload;
}

async function sendEmail({ to, subject, html }) {
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
      to: [to],
      subject,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Resend no pudo enviar el correo.");
  }

  return payload;
}

function encodeFilter(value) {
  return encodeURIComponent(String(value));
}

module.exports = {
  CONTENT,
  escapeHtml,
  getContent,
  formatTemplate,
  getBaseUrl,
  supabaseRequest,
  sendEmail,
  encodeFilter,
};
