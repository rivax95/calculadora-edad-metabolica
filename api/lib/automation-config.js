const fs = require("fs");
const path = require("path");

const AUTOMATION_DIR = path.join(process.cwd(), "email-automation");
const SEQUENCE_FILE = path.join(AUTOMATION_DIR, "sequence.json");
const EMAILS_DIR = path.join(AUTOMATION_DIR, "emails");

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadEmailFiles() {
  if (!fs.existsSync(EMAILS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(EMAILS_DIR)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((fileName) => ({
      ...readJsonFile(path.join(EMAILS_DIR, fileName)),
      sourceFile: fileName,
    }));
}

function getAutomationConfig() {
  const sequence = readJsonFile(SEQUENCE_FILE);
  const defaultDelayDays = Math.max(0, Number(sequence.defaultDelayDays) || 2);
  const steps = loadEmailFiles()
    .filter((step) => step?.active !== false && step?.key)
    .map((step, index) => ({
      ...step,
      stepOrder: index + 1,
      delayDays: Number.isFinite(Number(step.delayDays)) ? Number(step.delayDays) : defaultDelayDays * (index + 1),
    }))
    .sort((a, b) => a.delayDays - b.delayDays || a.stepOrder - b.stepOrder);

  return {
    ...sequence,
    enabled: Boolean(sequence.enabled),
    sequenceKey: sequence.sequenceKey || "metabolic_followup_v1",
    name: sequence.name || "Seguimiento edad metabólica",
    maxAttempts: Number(sequence.maxAttempts) || 3,
    defaultDelayDays,
    steps,
  };
}

function getAutomationText(key, fallback) {
  return getAutomationConfig()[key] ?? fallback;
}

module.exports = {
  getAutomationConfig,
  getAutomationText,
};
