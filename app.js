const defaults = {
  sex: "male",
  age: 30,
  height: 175,
  weight: 78,
  activity: "moderate",
};


const WHATSAPP_PHONE = "34623243958";
const EMAIL_ENDPOINT = "/api/send-result";
const TERMS_VERSION = "2026-05-14-v1";
const DEFAULT_WHATSAPP_MESSAGE = "Hola, quiero información sobre los planes después de usar la calculadora de edad metabólica.";

const activityProfiles = {
  sedentary: {
    label: "Sedentario",
    multiplier: 1.2,
    ageImpact: 7,
    score: 38,
  },
  light: {
    label: "Ligero",
    multiplier: 1.375,
    ageImpact: 3,
    score: 56,
  },
  moderate: {
    label: "Moderado",
    multiplier: 1.55,
    ageImpact: -2,
    score: 72,
  },
  active: {
    label: "Activo",
    multiplier: 1.725,
    ageImpact: -5,
    score: 86,
  },
  athlete: {
    label: "Muy activo",
    multiplier: 1.9,
    ageImpact: -7,
    score: 92,
  },
};

const form = document.querySelector("#metabolicForm");
const resetButton = document.querySelector("#resetButton");
const calculateButton = document.querySelector("#calculateButton");
const termsButton = document.querySelector("#termsButton");
const termsModal = document.querySelector("#termsModal");
const termsCloseButton = document.querySelector("#termsCloseButton");
const termsAcceptButton = document.querySelector("#termsAcceptButton");
const emailStatusModal = document.querySelector("#emailStatusModal");
const emailStatusCloseButton = document.querySelector("#emailStatusCloseButton");
const emailStatusAcceptButton = document.querySelector("#emailStatusAcceptButton");
const emailStatusEyebrow = document.querySelector("#emailStatusEyebrow");
const emailStatusTitle = document.querySelector("#emailStatusTitle");
const emailStatusText = document.querySelector("#emailStatusText");
const termsVersionLabel = document.querySelector("#termsVersionLabel");

const fields = {
  fullName: document.querySelector("#fullName"),
  phone: document.querySelector("#phone"),
  email: document.querySelector("#email"),
  privacyConsent: document.querySelector("#privacyConsent"),
  age: document.querySelector("#age"),
  height: document.querySelector("#height"),
  weight: document.querySelector("#weight"),
  activity: document.querySelector("#activity"),
};

const output = {
  resultsPanel: document.querySelector("#resultsPanel"),
  metabolicAge: document.querySelector("#metabolicAge"),
  metabolicBadge: document.querySelector("#metabolicBadge"),
  chronologicalAge: document.querySelector("#chronologicalAge"),
  bmr: document.querySelector("#bmr"),
  bmi: document.querySelector("#bmi"),
  bmiLabel: document.querySelector("#bmiLabel"),
  ageWheel: document.querySelector("#ageWheel"),
  ageDelta: document.querySelector("#ageDelta"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  activityLabel: document.querySelector("#activityLabel"),
  tdee: document.querySelector("#tdee"),
  statusLabel: document.querySelector("#statusLabel"),
  water: document.querySelector("#water"),
  bodyScoreBar: document.querySelector("#bodyScoreBar"),
  activityScoreBar: document.querySelector("#activityScoreBar"),
  vitalityScoreBar: document.querySelector("#vitalityScoreBar"),
  bodyScoreLabel: document.querySelector("#bodyScoreLabel"),
  activityScoreLabel: document.querySelector("#activityScoreLabel"),
  vitalityScoreLabel: document.querySelector("#vitalityScoreLabel"),
  whatsappLink: document.querySelector("#whatsappLink"),
};

const integerFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

let hasCalculated = false;
let latestResult = null;

function getSex() {
  return form.querySelector('input[name="sex"]:checked').value;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(Number(value) || min, min), max);
}

function getFormData() {
  return {
    fullName: fields.fullName.value.trim(),
    phone: fields.phone.value.trim(),
    email: fields.email.value.trim(),
    termsVersion: TERMS_VERSION,
    sex: getSex(),
    age: clampNumber(fields.age.value, 14, 90),
    height: clampNumber(fields.height.value, 120, 230),
    weight: clampNumber(fields.weight.value, 35, 250),
    activity: fields.activity.value,
  };
}

function getBmiImpact(bmi) {
  if (bmi < 18.5) return 4;
  if (bmi < 25) return -3;
  if (bmi < 30) return 4;
  if (bmi < 35) return 8;
  return 12;
}

function getBmiLabel(bmi) {
  if (bmi < 18.5) return "Bajo peso";
  if (bmi < 25) return "Rango saludable";
  if (bmi < 30) return "Rango elevado";
  if (bmi < 35) return "Rango alto";
  return "Rango muy alto";
}

function getBodyScore(bmi) {
  const distanceFromOptimal = Math.abs(bmi - 22);
  return Math.round(Math.max(28, Math.min(96, 94 - distanceFromOptimal * 8)));
}

function getResultCopy(delta) {
  if (delta <= -5) {
    return {
      badge: "Más joven",
      status: "Muy favorable",
      title: "Tu metabolismo apunta joven",
      text: "Tu actividad y composición estimada colocan tu edad metabólica por debajo de tu edad real.",
    };
  }

  if (delta <= 2) {
    return {
      badge: "En equilibrio",
      status: "Equilibrado",
      title: "Metabolismo en equilibrio",
      text: "Tu resultado se mantiene cerca de tu edad cronológica. La actividad y los hábitos diarios pueden moverlo a mejor o peor.",
    };
  }

  if (delta <= 7) {
    return {
      badge: "Mejorable",
      status: "Atención suave",
      title: "Hay margen para rejuvenecer",
      text: "Tu edad metabólica queda algo por encima de tu edad real. Más movimiento diario y una composición corporal saludable pueden ayudar.",
    };
  }

  return {
    badge: "Prioridad alta",
    status: "Revisar hábitos",
    title: "Tu metabolismo pide cuidado",
    text: "La estimación queda claramente por encima de tu edad real. Conviene revisar actividad, descanso, alimentación y seguimiento profesional si aplica.",
  };
}

function calculateMetabolicAge(data) {
  const sexConstant = data.sex === "male" ? 5 : -161;
  const heightMeters = data.height / 100;
  const bmi = data.weight / heightMeters ** 2;
  const bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + sexConstant;
  const profile = activityProfiles[data.activity];
  const tdee = bmr * profile.multiplier;
  const bmiImpact = getBmiImpact(bmi);
  const metabolicAge = Math.round(Math.max(14, Math.min(90, data.age + bmiImpact + profile.ageImpact)));
  const delta = metabolicAge - data.age;
  const bodyScore = getBodyScore(bmi);
  const activityScore = profile.score;
  const vitalityScore = Math.round(Math.max(20, Math.min(96, (bodyScore + activityScore + (delta <= 0 ? 86 : 68 - delta * 2)) / 3)));

  return {
    bmr,
    bmi,
    tdee,
    metabolicAge,
    delta,
    bodyScore,
    activityScore,
    vitalityScore,
    water: Math.max(data.weight * 0.035, 1.5),
    bmiLabel: getBmiLabel(bmi),
    activityLabel: profile.label,
    copy: getResultCopy(delta),
  };
}

function setText(element, value) {
  element.textContent = value;
}

function showResults() {
  output.resultsPanel.classList.remove("is-hidden");
  output.resultsPanel.setAttribute("aria-hidden", "false");
}

function hideResults() {
  output.resultsPanel.classList.add("is-hidden");
  output.resultsPanel.setAttribute("aria-hidden", "true");
}

function setScoreBar(bar, label, score) {
  bar.style.width = `${score}%`;
  label.textContent = `${score}%`;
}

function createWhatsappUrl(message) {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

function updateWhatsappLink(data, result) {
  const message = result
    ? `Hola, soy ${data.fullName}. Acabo de calcular mi edad metabólica. Tengo ${data.age} años, mi resultado estimado es ${result.metabolicAge} años y quiero saber por dónde empezar.`
    : DEFAULT_WHATSAPP_MESSAGE;

  output.whatsappLink.href = createWhatsappUrl(message);
}

function refreshSubmitState() {
  calculateButton.disabled = !form.checkValidity();
}

function openTermsModal() {
  termsModal.classList.remove("is-hidden");
  termsCloseButton.focus();
}

function closeTermsModal() {
  termsModal.classList.add("is-hidden");
  termsButton.focus();
}

function showEmailStatusModal({ eyebrow, title, text, isError = false }) {
  emailStatusEyebrow.textContent = eyebrow;
  emailStatusTitle.textContent = title;
  emailStatusText.textContent = text;
  emailStatusModal.querySelector(".status-modal").classList.toggle("is-error", isError);
  emailStatusModal.classList.remove("is-hidden");
  emailStatusAcceptButton.focus();
}

function closeEmailStatusModal() {
  emailStatusModal.classList.add("is-hidden");
  calculateButton.focus();
}

function render() {
  const data = getFormData();
  const result = calculateMetabolicAge(data);
  const deltaPrefix = result.delta > 0 ? "+" : "";
  const wheelProgress = Math.max(8, Math.min(100, 50 + result.delta * 4));

  setText(output.metabolicAge, integerFormatter.format(result.metabolicAge));
  setText(output.metabolicBadge, result.copy.badge);
  setText(output.chronologicalAge, integerFormatter.format(data.age));
  setText(output.bmr, integerFormatter.format(result.bmr));
  setText(output.bmi, decimalFormatter.format(result.bmi));
  setText(output.bmiLabel, result.bmiLabel);
  setText(output.ageDelta, `${deltaPrefix}${result.delta}`);
  setText(output.resultTitle, result.copy.title);
  setText(output.resultText, result.copy.text);
  setText(output.activityLabel, result.activityLabel);
  setText(output.tdee, integerFormatter.format(result.tdee));
  setText(output.statusLabel, result.copy.status);
  setText(output.water, decimalFormatter.format(result.water));

  output.ageWheel.style.setProperty("--ageProgress", `${wheelProgress}%`);
  output.ageWheel.classList.toggle("is-younger", result.delta <= -3);
  output.ageWheel.classList.toggle("is-older", result.delta >= 3);

  setScoreBar(output.bodyScoreBar, output.bodyScoreLabel, result.bodyScore);
  setScoreBar(output.activityScoreBar, output.activityScoreLabel, result.activityScore);
  setScoreBar(output.vitalityScoreBar, output.vitalityScoreLabel, result.vitalityScore);

  latestResult = result;
  updateWhatsappLink(data, latestResult);

  return { data, result };
}

async function sendResultEmail(data, result) {
  const response = await fetch(EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data, result }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo enviar el correo.");
  }

  return payload;
}

function resetForm() {
  hasCalculated = false;
  latestResult = null;
  fields.fullName.value = "";
  fields.phone.value = "";
  fields.email.value = "";
  fields.privacyConsent.checked = false;
  document.querySelector(`#${defaults.sex}`).checked = true;
  fields.age.value = defaults.age;
  fields.height.value = defaults.height;
  fields.weight.value = defaults.weight;
  fields.activity.value = defaults.activity;
  hideResults();
  updateWhatsappLink(getFormData(), null);
  refreshSubmitState();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  hasCalculated = true;
  const { data, result } = render();
  hideResults();

  calculateButton.disabled = true;

  try {
    await sendResultEmail(data, result);
    showEmailStatusModal({
      eyebrow: "Resultado enviado",
      title: "Revisa tu correo",
      text: `Te hemos enviado el resumen de tu edad metabólica a ${data.email}.`,
    });
  } catch (error) {
    showResults();
    showEmailStatusModal({
      eyebrow: "Resultado guardado",
      title: "Correo pendiente",
      text: "Hemos calculado tu resultado, pero el envío por correo necesita que Supabase y Resend estén configurados en el servidor.",
      isError: true,
    });
  } finally {
    refreshSubmitState();
  }
});

form.addEventListener("input", () => {
  refreshSubmitState();

  if (hasCalculated && form.checkValidity()) {
    render();
  }
});

form.addEventListener("change", () => {
  refreshSubmitState();

  if (hasCalculated && form.checkValidity()) {
    render();
  }
});

resetButton.addEventListener("click", resetForm);
termsButton.addEventListener("click", openTermsModal);
termsCloseButton.addEventListener("click", closeTermsModal);
termsAcceptButton.addEventListener("click", () => {
  fields.privacyConsent.checked = true;
  closeTermsModal();
  refreshSubmitState();

  if (hasCalculated && form.checkValidity()) {
    render();
  }
});
emailStatusCloseButton.addEventListener("click", closeEmailStatusModal);
emailStatusAcceptButton.addEventListener("click", closeEmailStatusModal);

termsModal.addEventListener("click", (event) => {
  if (event.target === termsModal) {
    closeTermsModal();
  }
});

emailStatusModal.addEventListener("click", (event) => {
  if (event.target === emailStatusModal) {
    closeEmailStatusModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !termsModal.classList.contains("is-hidden")) {
    closeTermsModal();
  }

  if (event.key === "Escape" && !emailStatusModal.classList.contains("is-hidden")) {
    closeEmailStatusModal();
  }
});

if (window.lucide) {
  window.lucide.createIcons();
}

if (termsVersionLabel) {
  termsVersionLabel.textContent = TERMS_VERSION;
}

hideResults();
updateWhatsappLink(getFormData(), null);
refreshSubmitState();
