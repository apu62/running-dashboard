export const TRAINING_TYPES = Object.freeze({
  unknown: "Nicht zugeordnet",
  recovery: "Regenerationslauf",
  easy: "Lockerer Lauf",
  tempo: "Tempolauf",
  interval: "Intervalltraining",
  long_run: "Langer Lauf",
  race: "Wettkampf",
});

const TRAINING_TYPE_ALIASES = new Map([
  ["recovery", "recovery"],
  ["regeneration", "recovery"],
  ["regenerationslauf", "recovery"],
  ["recovery run", "recovery"],
  ["easy", "easy"],
  ["locker", "easy"],
  ["lockerer lauf", "easy"],
  ["easy run", "easy"],
  ["tempo", "tempo"],
  ["tempolauf", "tempo"],
  ["tempo run", "tempo"],
  ["interval", "interval"],
  ["intervalle", "interval"],
  ["intervalltraining", "interval"],
  ["interval training", "interval"],
  ["long_run", "long_run"],
  ["long run", "long_run"],
  ["langer lauf", "long_run"],
  ["race", "race"],
  ["wettkampf", "race"],
  ["rennen", "race"],
  ["unknown", "unknown"],
  ["nicht zugeordnet", "unknown"],
]);

export function normalizeTrainingType(value) {
  if (value === null || value === undefined) return "unknown";
  const normalized = String(value).trim().toLocaleLowerCase("de");
  return TRAINING_TYPE_ALIASES.get(normalized) || "unknown";
}

export function formatTrainingType(value) {
  return TRAINING_TYPES[normalizeTrainingType(value)];
}

export function getTrainingTypeFromRecord(record = {}) {
  const value = record.trainingType
    ?? record.Trainingsart
    ?? record["Training Type"]
    ?? record["Workout Type"]
    ?? record.Laufart;
  return normalizeTrainingType(value);
}

export function getTrainingTypeOptions() {
  return Object.entries(TRAINING_TYPES).map(([value, label]) => ({ value, label }));
}
