const {
  escapeHtml,
  getContent,
  formatTemplate,
  getBaseUrl,
  supabaseRequest,
  sendEmail,
  encodeFilter,
} = require("./server-utils");

function getAutomationConfig() {
  const rawSteps = getContent("automation.emails", []);
  const defaultDelayDays = Math.max(0, Number(getContent("automation.defaultDelayDays", 2)) || 2);
  const steps = Array.isArray(rawSteps)
    ? rawSteps
        .filter((step) => step?.active !== false && step?.key)
        .map((step, index) => ({
          ...step,
          stepOrder: index + 1,
          delayDays: Number.isFinite(Number(step.delayDays)) ? Number(step.delayDays) : defaultDelayDays * (index + 1),
        }))
        .sort((a, b) => a.delayDays - b.delayDays || a.stepOrder - b.stepOrder)
    : [];

  return {
    enabled: Boolean(getContent("automation.enabled", false)),
    sequenceKey: getContent("automation.sequenceKey", "metabolic_followup_v1"),
    name: getContent("automation.name", "Seguimiento edad metabólica"),
    maxAttempts: Number(getContent("automation.maxAttempts", 3)) || 3,
    defaultDelayDays,
    steps,
  };
}

async function ensureSequence(config = getAutomationConfig()) {
  const sequenceRows = await supabaseRequest("/rest/v1/email_sequences?on_conflict=sequence_key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [
      {
        sequence_key: config.sequenceKey,
        name: config.name,
        active: config.enabled,
        updated_at: new Date().toISOString(),
      },
    ],
  });
  const sequence = Array.isArray(sequenceRows) ? sequenceRows[0] : sequenceRows;

  if (!sequence?.id) {
    throw new Error("No se pudo preparar la secuencia de automatización.");
  }

  if (config.steps.length) {
    await supabaseRequest("/rest/v1/email_sequence_steps?on_conflict=sequence_id,step_key", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: config.steps.map((step) => ({
        sequence_id: sequence.id,
        step_key: step.key,
        step_order: step.stepOrder,
        delay_days: step.delayDays,
        subject: step.subject || config.name,
        active: step.active !== false,
        updated_at: new Date().toISOString(),
      })),
    });
  }

  const stepRows = await supabaseRequest(
    `/rest/v1/email_sequence_steps?select=id,step_key,delay_days,subject,active&sequence_id=eq.${sequence.id}`,
  );
  const stepsByKey = Object.fromEntries((stepRows || []).map((step) => [step.step_key, step]));

  return { sequence, stepsByKey };
}

async function enrollInAutomation({ data, result, savedRecord }) {
  const config = getAutomationConfig();

  if (!config.enabled || !config.steps.length) {
    return { enrolled: false, reason: "automation_disabled" };
  }

  const normalizedEmail = String(data.email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return { enrolled: false, reason: "missing_email" };
  }

  const { sequence } = await ensureSequence(config);
  const existingRows = await supabaseRequest(
    `/rest/v1/email_sequence_enrollments?select=id,status,unsubscribe_token&sequence_id=eq.${sequence.id}&email=eq.${encodeFilter(normalizedEmail)}&limit=1`,
  );
  const existing = existingRows?.[0];

  if (existing?.status === "unsubscribed") {
    return { enrolled: false, reason: "unsubscribed", id: existing.id };
  }

  if (existing?.id) {
    return { enrolled: false, reason: "already_enrolled", id: existing.id };
  }

  const rows = await supabaseRequest("/rest/v1/email_sequence_enrollments", {
    method: "POST",
    prefer: "return=representation",
    body: [
      {
        sequence_id: sequence.id,
        metabolic_result_id: savedRecord?.id || null,
        full_name: data.fullName,
        email: normalizedEmail,
        phone: data.phone || null,
        metadata: {
          chronologicalAge: data.age,
          metabolicAge: result.metabolicAge,
          ageDelta: result.delta,
          resultBadge: result.copy?.badge || null,
          activity: data.activity,
          energyLevel: data.energyLevel,
          sleepQuality: data.sleepQuality,
          stressAnxiety: data.stressAnxiety,
        },
      },
    ],
  });

  return { enrolled: true, id: rows?.[0]?.id };
}

function buildStepEmail({ enrollment, step, baseUrl }) {
  const values = {
    fullName: enrollment.full_name,
    email: enrollment.email,
    metabolicAge: enrollment.metadata?.metabolicAge,
    chronologicalAge: enrollment.metadata?.chronologicalAge,
    ageDelta: enrollment.metadata?.ageDelta,
  };
  const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(enrollment.unsubscribe_token)}`;
  const whatsappMessage = encodeURIComponent(
    formatTemplate(getContent("automation.defaultWhatsappMessage", "Hola, quiero saber por dónde empezar."), values),
  );
  const whatsappUrl = `https://wa.me/${getContent("whatsapp.phone", "34623243958")}?text=${whatsappMessage}`;
  const body = Array.isArray(step.body) ? step.body : [];
  const subject = formatTemplate(step.subject || getContent("automation.name", "Seguimiento"), values);

  return {
    subject,
    html: `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#151515;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f1f1;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e4e4e4;">
            <tr>
              <td style="padding:34px 30px 28px;">
                <div style="display:inline-block;background:#111;color:#fff;font-weight:900;text-transform:uppercase;padding:6px 12px;border-radius:4px;font-size:12px;">${escapeHtml(getContent("automation.senderName", "Calculadora"))}</div>
                <h1 style="margin:18px 0 12px;font-size:34px;line-height:1;font-weight:900;">${escapeHtml(formatTemplate(step.title || subject, values))}</h1>
                <p style="margin:0;color:#686868;font-weight:700;line-height:1.55;">${escapeHtml(getContent("automation.preheader", ""))}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 28px;color:#333;font-size:16px;line-height:1.62;font-weight:700;">
                ${body
                  .map((paragraph) => `<p style="margin:0 0 16px;">${escapeHtml(formatTemplate(paragraph, values))}</p>`)
                  .join("")}
                <p style="margin:26px 0 0;">
                  <a href="${whatsappUrl}" style="display:inline-block;background:#111;color:#fff;border-radius:12px;padding:15px 22px;text-decoration:none;font-weight:900;text-transform:uppercase;">
                    ${escapeHtml(step.ctaText || getContent("automation.defaultCtaText", "Hablar por WhatsApp"))}
                  </a>
                </p>
              </td>
            </tr>
          </table>
          <p style="max-width:660px;margin:16px auto 0;color:#777;font-size:12px;line-height:1.5;">
            ${escapeHtml(getContent("automation.footerText", ""))}
            <br>
            <a href="${unsubscribeUrl}" style="color:#555;text-decoration:underline;">${escapeHtml(getContent("automation.unsubscribeText", "Cancelar estos correos"))}</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

function getScheduledFor(enrollment, step) {
  const startedAt = new Date(enrollment.started_at).getTime();
  return new Date(startedAt + step.delayDays * 24 * 60 * 60 * 1000);
}

async function getExistingSend(enrollmentId, stepKey) {
  const rows = await supabaseRequest(
    `/rest/v1/email_sequence_sends?select=id,status,attempt_count&enrollment_id=eq.${enrollmentId}&step_key=eq.${encodeFilter(stepKey)}&limit=1`,
  );
  return rows?.[0] || null;
}

async function upsertSend({ enrollment, stepRow, step, scheduledFor, status, attemptCount, resendEmailId, error }) {
  const rows = await supabaseRequest("/rest/v1/email_sequence_sends?on_conflict=enrollment_id,step_key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [
      {
        enrollment_id: enrollment.id,
        step_id: stepRow?.id || null,
        step_key: step.key,
        scheduled_for: scheduledFor.toISOString(),
        status,
        attempt_count: attemptCount,
        last_attempt_at: new Date().toISOString(),
        sent_at: status === "sent" ? new Date().toISOString() : null,
        resend_email_id: resendEmailId || null,
        error: error || null,
        updated_at: new Date().toISOString(),
      },
    ],
  });
  return rows?.[0] || null;
}

async function updateEnrollment(id, body) {
  return supabaseRequest(`/rest/v1/email_sequence_enrollments?id=eq.${id}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: {
      ...body,
      updated_at: new Date().toISOString(),
    },
  });
}

async function runDueAutomation({ req }) {
  const config = getAutomationConfig();

  if (!config.enabled || !config.steps.length) {
    return { processed: 0, sent: 0, errors: 0, skipped: 0, reason: "automation_disabled" };
  }

  const { sequence, stepsByKey } = await ensureSequence(config);
  const enrollments = await supabaseRequest(
    `/rest/v1/email_sequence_enrollments?select=id,full_name,email,metadata,started_at,status,unsubscribe_token&sequence_id=eq.${sequence.id}&status=eq.active&order=started_at.asc&limit=100`,
  );
  const now = Date.now();
  const baseUrl = getBaseUrl(req);
  let processed = 0;
  let sent = 0;
  let errors = 0;
  let skipped = 0;

  for (const enrollment of enrollments || []) {
    processed += 1;

    for (const step of config.steps) {
      const scheduledFor = getScheduledFor(enrollment, step);

      if (scheduledFor.getTime() > now) {
        skipped += 1;
        break;
      }

      const existing = await getExistingSend(enrollment.id, step.key);

      if (existing?.status === "sent") {
        continue;
      }

      const attemptCount = Number(existing?.attempt_count || 0);

      if (attemptCount >= config.maxAttempts) {
        skipped += 1;
        await updateEnrollment(enrollment.id, { last_error: `Máximo de intentos alcanzado en ${step.key}` });
        break;
      }

      try {
        const message = buildStepEmail({ enrollment, step, baseUrl });
        const payload = await sendEmail({ to: enrollment.email, subject: message.subject, html: message.html });
        await upsertSend({
          enrollment,
          stepRow: stepsByKey[step.key],
          step,
          scheduledFor,
          status: "sent",
          attemptCount: attemptCount + 1,
          resendEmailId: payload.id,
        });
        sent += 1;

        if (step.key === config.steps[config.steps.length - 1].key) {
          await updateEnrollment(enrollment.id, { status: "completed", completed_at: new Date().toISOString(), last_error: null });
        }
      } catch (error) {
        errors += 1;
        await upsertSend({
          enrollment,
          stepRow: stepsByKey[step.key],
          step,
          scheduledFor,
          status: "error",
          attemptCount: attemptCount + 1,
          error: error.message,
        });
        await updateEnrollment(enrollment.id, { last_error: error.message });
      }

      break;
    }
  }

  return { processed, sent, errors, skipped };
}

async function unsubscribeByToken(token) {
  const rows = await supabaseRequest(
    `/rest/v1/email_sequence_enrollments?select=id,status&unsubscribe_token=eq.${encodeFilter(token)}&limit=1`,
  );
  const enrollment = rows?.[0];

  if (!enrollment?.id) {
    return { ok: false, reason: "not_found" };
  }

  await updateEnrollment(enrollment.id, {
    status: "unsubscribed",
    unsubscribed_at: new Date().toISOString(),
  });

  return { ok: true };
}

module.exports = {
  enrollInAutomation,
  runDueAutomation,
  unsubscribeByToken,
  ensureSequence,
};
