const defaults = {
  sex: "male",
  age: 30,
  height: 175,
  weight: 78,
  activity: "moderate",
  energyLevel: "stable",
  sleepQuality: "normal",
  stressAnxiety: "no",
};


const WHATSAPP_PHONE = "34623243958";
const EMAIL_ENDPOINT = "/api/send-result";
const TERMS_ENDPOINT = "/api/terms";
const CONTENT_ENDPOINT = "/content.json";
const FALLBACK_TERMS = {
  version: "2026-05-14-v1",
  title: "Términos y privacidad",
  content:
    "Estos textos son provisionales. La calculadora ofrece una estimación orientativa y no sustituye una valoración médica, nutricional o deportiva profesional.\n\nAl enviar el formulario aceptas que los datos introducidos puedan utilizarse para calcular tu resultado y contactarte con información relacionada con planes, asesoramiento o seguimiento.\n\nTus datos no deberían compartirse con terceros salvo obligación legal o proveedores necesarios para prestar el servicio. Puedes solicitar acceso, rectificación o eliminación de tus datos.",
};
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

const stressProfiles = {
  no: {
    label: "No, casi nunca",
    ageImpact: 0,
  },
  sometimes: {
    label: "A veces",
    ageImpact: 1,
  },
  frequent: {
    label: "Sí, frecuentemente",
    ageImpact: 3,
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
const termsTitle = document.querySelector("#termsTitle");
const termsContent = document.querySelector("#termsContent");
const termsVersionLabel = document.querySelector("#termsVersionLabel");
const whatsappSection = document.querySelector("#whatsappSection");

const fields = {
  fullName: document.querySelector("#fullName"),
  phone: document.querySelector("#phone"),
  email: document.querySelector("#email"),
  privacyConsent: document.querySelector("#privacyConsent"),
  age: document.querySelector("#age"),
  height: document.querySelector("#height"),
  weight: document.querySelector("#weight"),
  activity: document.querySelector("#activity"),
  energyLevel: document.querySelector("#energyLevel"),
  sleepQuality: document.querySelector("#sleepQuality"),
  stressAnxiety: document.querySelector("#stressAnxiety"),
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
let currentTerms = FALLBACK_TERMS;
let shouldScrollToWhatsapp = false;
let content = {};

function getContent(path, fallback) {
  const value = path.split(".").reduce((current, key) => current?.[key], content);
  return value ?? fallback;
}

function formatTemplate(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function setSelectorText(selector, value) {
  const element = document.querySelector(selector);

  if (element && value) {
    element.textContent = value;
  }
}

function setSelectorAttribute(selector, attribute, value) {
  const element = document.querySelector(selector);

  if (element && value) {
    element.setAttribute(attribute, value);
  }
}

function setButtonWithIcon(button, label, iconName) {
  if (!button || !label) return;

  button.textContent = label;
  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", iconName);
  button.appendChild(icon);
}

function setRadioLabel(value, label) {
  const input = form.querySelector(`input[name="sex"][value="${value}"]`);

  if (input?.parentElement && label) {
    input.parentElement.lastChild.textContent = ` ${label}`;
  }
}

function setSelectOptions(select, options, fallbackValue) {
  if (!select || !options) return;

  const selectedValue = select.value || fallbackValue;
  select.innerHTML = "";

  for (const [value, label] of Object.entries(options)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  select.value = options[selectedValue] ? selectedValue : fallbackValue;
}

function applyContent() {
  document.title = getContent("page.browserTitle", document.title);
  setSelectorText(".page-title span", getContent("page.headerPrefix"));
  setSelectorText(".page-title strong", getContent("page.headerHighlight"));
  setSelectorText(".card-heading .eyebrow", getContent("page.heroEyebrow"));
  setSelectorText(".card-heading h1", getContent("page.heroTitle"));
  setSelectorText(".card-heading p", getContent("page.heroText"));

  setSelectorText('label[for="fullName"]', getContent("form.labels.fullName"));
  setSelectorText('label[for="email"]', getContent("form.labels.email"));
  setSelectorText('label[for="age"]', getContent("form.labels.age"));
  setSelectorText('label[for="height"]', getContent("form.labels.height"));
  setSelectorText('label[for="weight"]', getContent("form.labels.weight"));
  setSelectorText('label[for="activity"]', getContent("form.labels.activity"));
  setSelectorText('label[for="energyLevel"]', getContent("form.labels.energyLevel"));
  setSelectorText('label[for="sleepQuality"]', getContent("form.labels.sleepQuality"));
  setSelectorText('label[for="stressAnxiety"]', getContent("form.labels.stressAnxiety"));
  setSelectorText(".optional-label", getContent("form.labels.optional"));

  const phoneLabel = document.querySelector('label[for="phone"]');
  const phoneText = getContent("form.labels.phone");
  const optionalText = getContent("form.labels.optional");
  if (phoneLabel && phoneText && optionalText) {
    phoneLabel.innerHTML = `${phoneText} <span class="optional-label">${optionalText}</span>`;
  }

  const sexFieldLabel = document.querySelector(".choice-row")?.previousElementSibling;
  if (sexFieldLabel) {
    sexFieldLabel.textContent = getContent("form.labels.sex", sexFieldLabel.textContent);
  }

  setSelectorAttribute("#fullName", "placeholder", getContent("form.placeholders.fullName"));
  setSelectorAttribute("#email", "placeholder", getContent("form.placeholders.email"));
  setSelectorAttribute("#phone", "placeholder", getContent("form.placeholders.phone"));
  setSelectorAttribute("#resetButton", "aria-label", getContent("form.resetLabel"));
  setButtonWithIcon(calculateButton, getContent("form.calculateButton"), "arrow-right");

  setRadioLabel("male", getContent("form.options.sex.male"));
  setRadioLabel("female", getContent("form.options.sex.female"));
  setSelectOptions(fields.activity, getContent("form.options.activity"), defaults.activity);
  setSelectOptions(fields.energyLevel, getContent("form.options.energyLevel"), defaults.energyLevel);
  setSelectOptions(fields.sleepQuality, getContent("form.options.sleepQuality"), defaults.sleepQuality);
  setSelectOptions(fields.stressAnxiety, getContent("form.options.stressAnxiety"), defaults.stressAnxiety);

  const consentLabels = document.querySelectorAll(".consent-row label");
  if (consentLabels[0]) consentLabels[0].textContent = getContent("form.consentBefore", consentLabels[0].textContent);
  if (consentLabels[1]) consentLabels[1].textContent = getContent("form.consentAfter", consentLabels[1].textContent);
  setSelectorText("#termsButton", getContent("form.consentLink"));

  setSelectorAttribute("#resultsPanel", "aria-label", getContent("results.ariaLabel"));
  setSelectorText(".result-main .eyebrow", getContent("results.eyebrow"));
  setSelectorText(".age-line small", getContent("results.years"));
  setSelectorText(".metric-card:nth-child(1) p", getContent("results.realAgeLabel"));
  setSelectorText(".metric-card:nth-child(1) small", getContent("results.realAgeCaption"));
  setSelectorText(".metric-card:nth-child(2) p", getContent("results.bmrLabel"));
  setSelectorText(".metric-card:nth-child(2) small", getContent("results.bmrUnit"));
  setSelectorText(".metric-card:nth-child(3) p", getContent("results.bmiLabel"));
  setSelectorText(".meter-caption small", getContent("results.deltaCaption"));
  setSelectorText(".insight-card .eyebrow", getContent("results.summaryTitle"));
  setSelectorText(".stats-row:nth-child(1) span", getContent("results.activityLabel"));
  setSelectorText(".stats-row:nth-child(2) span", getContent("results.tdeeLabel"));
  setSelectorText(".stats-row:nth-child(3) span", getContent("results.statusLabel"));
  setSelectorText(".stats-row:nth-child(4) span", getContent("results.waterLabel"));
  setSelectorText(".score-item:nth-child(1) span", getContent("results.compositionScore"));
  setSelectorText(".score-item:nth-child(2) span", getContent("results.activityScore"));
  setSelectorText(".score-item:nth-child(3) span", getContent("results.vitalityScore"));

  setSelectorText(".whatsapp-copy h2", getContent("whatsapp.title"));
  setSelectorText(".whatsapp-copy p", getContent("whatsapp.text"));
  const whatsappButtonText = getContent("whatsapp.button");
  if (whatsappButtonText) {
    output.whatsappLink.lastChild.textContent = ` ${whatsappButtonText}`;
  }

  setSelectorAttribute("#termsCloseButton", "aria-label", getContent("modals.terms.closeLabel"));
  setSelectorText("#termsModal .eyebrow", getContent("modals.terms.eyebrow"));
  setSelectorText("#termsAcceptButton", getContent("modals.terms.acceptButton"));
  const termsVersion = document.querySelector(".terms-version");
  const termsVersionLabelText = getContent("modals.terms.versionLabel");
  if (termsVersion?.firstChild && termsVersionLabelText) {
    termsVersion.firstChild.textContent = `${termsVersionLabelText} `;
  }
  setSelectorAttribute("#emailStatusCloseButton", "aria-label", getContent("modals.email.closeLabel"));
  setSelectorText("#emailStatusAcceptButton", getContent("modals.email.acceptButton"));

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function preloadContent() {
  try {
    const response = await fetch(CONTENT_ENDPOINT);
    const payload = await response.json().catch(() => ({}));

    if (response.ok && payload && typeof payload === "object") {
      content = payload;
      applyContent();
      updateWhatsappLink(getFormData(), latestResult);
      if (hasCalculated && form.checkValidity()) {
        render();
      }
    }
  } catch (error) {
    applyContent();
  }
}

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
    termsVersion: currentTerms.version,
    sex: getSex(),
    age: clampNumber(fields.age.value, 14, 90),
    height: clampNumber(fields.height.value, 120, 230),
    weight: clampNumber(fields.weight.value, 35, 250),
    activity: fields.activity.value,
    energyLevel: fields.energyLevel.value,
    sleepQuality: fields.sleepQuality.value,
    stressAnxiety: fields.stressAnxiety.value,
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
    return getContent("resultCopies.younger", {
      badge: "Más joven",
      status: "Muy favorable",
      title: "Tu metabolismo apunta joven",
      text: "Tu actividad y composición estimada colocan tu edad metabólica por debajo de tu edad real.",
    });
  }

  if (delta <= 2) {
    return getContent("resultCopies.balanced", {
      badge: "En equilibrio",
      status: "Equilibrado",
      title: "Metabolismo en equilibrio",
      text: "Tu resultado se mantiene cerca de tu edad cronológica. La actividad y los hábitos diarios pueden moverlo a mejor o peor.",
    });
  }

  if (delta <= 7) {
    return getContent("resultCopies.improvable", {
      badge: "Mejorable",
      status: "Atención suave",
      title: "Hay margen para rejuvenecer",
      text: "Tu edad metabólica queda algo por encima de tu edad real. Más movimiento diario y una composición corporal saludable pueden ayudar.",
    });
  }

  return getContent("resultCopies.highPriority", {
    badge: "Prioridad alta",
    status: "Revisar hábitos",
    title: "Tu metabolismo pide cuidado",
    text: "La estimación queda claramente por encima de tu edad real. Conviene revisar actividad, descanso, alimentación y seguimiento profesional si aplica.",
  });
}

function calculateMetabolicAge(data) {
  const sexConstant = data.sex === "male" ? 5 : -161;
  const heightMeters = data.height / 100;
  const bmi = data.weight / heightMeters ** 2;
  const bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + sexConstant;
  const profile = activityProfiles[data.activity];
  const stressProfile = stressProfiles[data.stressAnxiety] || stressProfiles.no;
  const tdee = bmr * profile.multiplier;
  const bmiImpact = getBmiImpact(bmi);
  const metabolicAge = Math.round(
    Math.max(14, Math.min(90, data.age + bmiImpact + profile.ageImpact + stressProfile.ageImpact)),
  );
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
    activityLabel: getContent(`form.options.activity.${data.activity}`, profile.label),
    stressLabel: getContent(`form.options.stressAnxiety.${data.stressAnxiety}`, stressProfile.label),
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
  const values = { ...data, ...(result || {}) };
  const fallback = result
    ? `Hola, soy ${data.fullName}. Acabo de calcular mi edad metabólica. Tengo ${data.age} años, mi resultado estimado es ${result.metabolicAge} años y quiero saber por dónde empezar.`
    : DEFAULT_WHATSAPP_MESSAGE;
  const template = result ? getContent("whatsapp.resultMessage", fallback) : getContent("whatsapp.defaultMessage", fallback);
  const message = formatTemplate(template, values);

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

function closeEmailStatusModal({ scrollToWhatsapp = false } = {}) {
  emailStatusModal.classList.add("is-hidden");
  calculateButton.focus();

  if (scrollToWhatsapp && shouldScrollToWhatsapp && whatsappSection) {
    shouldScrollToWhatsapp = false;
    whatsappSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderTerms(terms) {
  currentTerms = terms || FALLBACK_TERMS;
  termsTitle.textContent = currentTerms.title;
  termsVersionLabel.textContent = currentTerms.version;
  termsContent.innerHTML = "";

  for (const paragraph of currentTerms.content.split(/\n{2,}/).filter(Boolean)) {
    const element = document.createElement("p");
    element.textContent = paragraph.trim();
    termsContent.appendChild(element);
  }
}

async function preloadTerms() {
  renderTerms(FALLBACK_TERMS);

  try {
    const response = await fetch(TERMS_ENDPOINT);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.terms) {
      throw new Error(payload.error || "No se pudieron cargar los términos.");
    }

    renderTerms(payload.terms);
  } catch (error) {
    renderTerms(FALLBACK_TERMS);
  }
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
  fields.energyLevel.value = defaults.energyLevel;
  fields.sleepQuality.value = defaults.sleepQuality;
  fields.stressAnxiety.value = defaults.stressAnxiety;
  hideResults();
  whatsappSection.classList.add("is-hidden");
  shouldScrollToWhatsapp = false;
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
  whatsappSection.classList.remove("is-hidden");

  calculateButton.disabled = true;

  try {
    await sendResultEmail(data, result);
    showEmailStatusModal({
      eyebrow: getContent("modals.email.success.eyebrow", "Resultado enviado"),
      title: getContent("modals.email.success.title", "Revisa tu correo"),
      text: formatTemplate(getContent("modals.email.success.text", "Te hemos enviado el resumen de tu edad metabólica a {email}."), { email: data.email }),
    });
    shouldScrollToWhatsapp = true;
  } catch (error) {
    showResults();
    showEmailStatusModal({
      eyebrow: getContent("modals.email.error.eyebrow", "Resultado guardado"),
      title: getContent("modals.email.error.title", "Correo pendiente"),
      text: getContent("modals.email.error.text", "Hemos calculado tu resultado, pero el envío por correo necesita que Supabase y Resend estén configurados en el servidor."),
      isError: true,
    });
    shouldScrollToWhatsapp = false;
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
emailStatusAcceptButton.addEventListener("click", () => {
  closeEmailStatusModal({ scrollToWhatsapp: true });
});

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

hideResults();
whatsappSection.classList.add("is-hidden");
updateWhatsappLink(getFormData(), null);
refreshSubmitState();
preloadContent();
preloadTerms();
