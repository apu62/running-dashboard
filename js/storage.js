export const STORAGE_KEYS = Object.freeze({
  runs: "lauf-tagebuch-eintraege",
  shoes: "lauf-schuhe-v2",
  shoeMigration: "lauf-schuhe-v2-initialisiert",
  metadata: "running-dashboard-meta-v2",
  legacyShoes: "lauf-schuhliste",
  legacyHiddenShoes: "lauf-versteckte-schuhe",
  recovery: "running-dashboard-recovery-v2",
  recoveryBackups: "running-dashboard-recovery-backups-v1",
  settings: "running-dashboard-settings-v1",
  theme: "running-dashboard-theme",
});

export const DEFAULT_SETTINGS = Object.freeze({
  theme: "system",
  historyPageSize: 10,
  historySort: "newest",
  historyShoeFilter: "all",
  monthFilter: "all",
  routeFilter: "all",
  benchmarkFilter: "all",
  overviewPeriod: "30days",
});

const health = { runs: null, shoes: null, metadata: null, settings: null };

function readJson(key, fallback, expected) {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    health[expected] = { ok: true, missing: true };
    return fallback;
  }
  try {
    const value = JSON.parse(raw);
    if ((expected === "runs" || expected === "shoes") && !Array.isArray(value)) {
      throw new TypeError(`${key} enthält kein Array`);
    }
    health[expected] = { ok: true, missing: false };
    return value;
  } catch (error) {
    health[expected] = { ok: false, missing: false, error: error.message, raw };
    return fallback;
  }
}

export function loadRunsSafely() {
  return readJson(STORAGE_KEYS.runs, [], "runs");
}

export function loadShoesSafely() {
  return readJson(STORAGE_KEYS.shoes, [], "shoes")
    .filter((shoe) => shoe && typeof shoe.id === "string" && typeof shoe.name === "string");
}

export function loadMetadata() {
  return readJson(STORAGE_KEYS.metadata, {}, "metadata");
}

export function normalizeSettings(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const historyPageSize = Number(source.historyPageSize);
  return {
    ...source,
    theme: ["light", "dark", "system"].includes(source.theme) ? source.theme : DEFAULT_SETTINGS.theme,
    historyPageSize: [10, 20, 50].includes(historyPageSize) ? historyPageSize : DEFAULT_SETTINGS.historyPageSize,
    historySort: ["newest", "oldest"].includes(source.historySort) ? source.historySort : DEFAULT_SETTINGS.historySort,
    historyShoeFilter: typeof source.historyShoeFilter === "string" ? source.historyShoeFilter : DEFAULT_SETTINGS.historyShoeFilter,
    monthFilter: typeof source.monthFilter === "string" ? source.monthFilter : DEFAULT_SETTINGS.monthFilter,
    routeFilter: typeof source.routeFilter === "string" ? source.routeFilter : DEFAULT_SETTINGS.routeFilter,
    benchmarkFilter: ["all", "5k", "10k", "15k"].includes(source.benchmarkFilter) ? source.benchmarkFilter : DEFAULT_SETTINGS.benchmarkFilter,
    overviewPeriod: ["30days", "week", "month", "year", "all"].includes(source.overviewPeriod) ? source.overviewPeriod : DEFAULT_SETTINGS.overviewPeriod,
  };
}

export function loadSettings() {
  const stored = readJson(STORAGE_KEYS.settings, {}, "settings");
  const legacyTheme = localStorage.getItem(STORAGE_KEYS.theme);
  return normalizeSettings({
    ...stored,
    theme: stored?.theme || (["light", "dark"].includes(legacyTheme) ? legacyTheme : DEFAULT_SETTINGS.theme),
  });
}

export function saveSettings(settings) {
  assertWritable("settings");
  const normalized = normalizeSettings(settings);
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(normalized));
  localStorage.setItem(STORAGE_KEYS.theme, normalized.theme);
  health.settings = { ok: true, missing: false };
  return normalized;
}

export function getStorageHealth() {
  return structuredClone(health);
}

function assertWritable(area) {
  if (health[area]?.ok === false) {
    throw new Error(`Speichern blockiert: Die vorhandenen ${area === "runs" ? "Lauf" : "Schuh"}daten sind beschädigt und wurden nicht überschrieben.`);
  }
}

export function saveRunsSafely(runs, appVersion, dbVersion) {
  assertWritable("runs");
  assertWritable("metadata");
  localStorage.setItem(STORAGE_KEYS.runs, JSON.stringify(runs));
  touchMetadata(appVersion, dbVersion);
}

export function saveShoesSafely(shoes, appVersion, dbVersion) {
  assertWritable("shoes");
  assertWritable("metadata");
  localStorage.setItem(STORAGE_KEYS.shoes, JSON.stringify(shoes));
  touchMetadata(appVersion, dbVersion);
}

export function touchMetadata(appVersion, dbVersion, extra = {}) {
  assertWritable("metadata");
  const current = loadMetadata();
  const next = {
    ...current,
    ...extra,
    appVersion,
    dbVersion,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.metadata, JSON.stringify(next));
  health.metadata = { ok: true, missing: false };
  return next;
}

export function updateBackupMetadata(appVersion, dbVersion) {
  return touchMetadata(appVersion, dbVersion, { lastBackupAt: new Date().toISOString() });
}

export function replaceDatabaseSafely(nextRuns, nextShoes, metadata, appVersion, dbVersion, settings) {
  const serializedRuns = JSON.stringify(nextRuns);
  const serializedShoes = JSON.stringify(nextShoes);
  const keys = [STORAGE_KEYS.runs, STORAGE_KEYS.shoes, STORAGE_KEYS.metadata, STORAGE_KEYS.settings, STORAGE_KEYS.theme];
  const previousValues = new Map(keys.map((key) => [key, localStorage.getItem(key)]));
  const previousHealth = structuredClone(health);
  try {
    localStorage.setItem(STORAGE_KEYS.runs, serializedRuns);
    localStorage.setItem(STORAGE_KEYS.shoes, serializedShoes);
    health.runs = { ok: true, missing: false };
    health.shoes = { ok: true, missing: false };
    health.metadata = { ok: true, missing: false };
    health.settings = { ok: true, missing: false };
    touchMetadata(appVersion, dbVersion, metadata || {});
    if (settings) saveSettings(settings);
  } catch (error) {
    previousValues.forEach((value, key) => {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    });
    Object.assign(health, previousHealth);
    throw new Error(`Daten konnten nicht vollständig übernommen werden; der vorherige Zustand wurde wiederhergestellt. ${error.message}`);
  }
}
