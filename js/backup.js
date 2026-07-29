import { STORAGE_KEYS, loadMetadata, loadSettings, normalizeSettings } from "./storage.js";

const MAX_RECOVERY_BACKUPS = 5;
let recoveryReadError = null;

export function createBackupObject(runs, shoes, appVersion, dbVersion, settings = loadSettings()) {
  return {
    format: "running-dashboard-backup",
    schemaVersion: 2,
    appVersion,
    dbVersion,
    exportedAt: new Date().toISOString(),
    runs: structuredClone(runs),
    shoes: structuredClone(shoes),
    metadata: structuredClone(loadMetadata()),
    settings: structuredClone(normalizeSettings(settings)),
  };
}

export function loadRecoveryBackups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.recoveryBackups);
    if (raw === null) {
      recoveryReadError = null;
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("Der Recovery-Speicher enthält kein Array.");
    if (parsed.some((backup) => !backup?.id || !Array.isArray(backup.runs) || !Array.isArray(backup.shoes))) {
      throw new TypeError("Mindestens ein Recovery-Backup besitzt ein unbekanntes oder beschädigtes Format.");
    }
    recoveryReadError = null;
    return parsed.slice(0, MAX_RECOVERY_BACKUPS);
  } catch (error) {
    recoveryReadError = error;
    console.error("Recovery-Backups konnten nicht gelesen werden. Der vorhandene Wert bleibt unverändert.", error);
    return [];
  }
}

export function getRecoveryHealth() {
  return recoveryReadError ? { ok: false, error: recoveryReadError.message } : { ok: true };
}

function persistRecoveryBackups(backups) {
  if (recoveryReadError) throw new Error("Recovery-Backup konnte nicht gespeichert werden, weil der vorhandene Recovery-Speicher beschädigt ist.");
  localStorage.setItem(STORAGE_KEYS.recoveryBackups, JSON.stringify(backups.slice(0, MAX_RECOVERY_BACKUPS)));
}

export function createRecoverySnapshot(reason, appVersion, dbVersion, runs, shoes, settings = loadSettings()) {
  const snapshot = {
    id: crypto.randomUUID(),
    format: "running-dashboard-recovery",
    reason,
    createdAt: new Date().toISOString(),
    appVersion,
    dbVersion,
    runCount: runs.length,
    shoeCount: shoes.length,
    runs: structuredClone(runs),
    shoes: structuredClone(shoes),
    settings: structuredClone(normalizeSettings(settings)),
    metadata: structuredClone(loadMetadata()),
  };
  persistRecoveryBackups([snapshot, ...loadRecoveryBackups()]);
  return snapshot;
}

export function deleteRecoveryBackup(id) {
  persistRecoveryBackups(loadRecoveryBackups().filter((backup) => backup.id !== id));
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const isString = (value) => typeof value === "string";
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

export function validateBackup(data, maxDbVersion) {
  const errors = [];
  if (!data || data.format !== "running-dashboard-backup") errors.push("Unbekanntes Backup-Format.");
  if (!Array.isArray(data?.runs)) errors.push("Die Laufdaten fehlen.");
  if (!Array.isArray(data?.shoes)) errors.push("Die Schuhdaten fehlen.");
  if (Number(data?.dbVersion) > maxDbVersion) errors.push("Das Backup stammt aus einer neueren, nicht unterstützten Datenbankversion.");
  if (errors.length) return { ok: false, errors };

  const runIds = new Set();
  data.runs.forEach((run, index) => {
    if (!run || !isString(run.id) || !run.id) errors.push(`Lauf ${index + 1}: ungültige ID.`);
    else if (runIds.has(run.id)) errors.push(`Lauf ${index + 1}: doppelte ID.`);
    else runIds.add(run.id);
    if (!isString(run.date) || !/^\d{4}-\d{2}-\d{2}$/.test(run.date)) errors.push(`Lauf ${index + 1}: ungültiges Datum.`);
    if (!isFiniteNumber(run.distance) || run.distance <= 0) errors.push(`Lauf ${index + 1}: ungültige Distanz.`);
    if (!isFiniteNumber(run.duration) || run.duration <= 0) errors.push(`Lauf ${index + 1}: ungültige Dauer.`);
    if (!isFiniteNumber(run.pace) || run.pace <= 0) errors.push(`Lauf ${index + 1}: ungültige Pace.`);
  });

  const shoeIds = new Set();
  data.shoes.forEach((shoe, index) => {
    if (!shoe || !isString(shoe.id) || !shoe.id || !isString(shoe.name) || !shoe.name.trim()) {
      errors.push(`Schuh ${index + 1}: ungültige Daten.`);
    } else if (shoeIds.has(shoe.id)) {
      errors.push(`Schuh ${index + 1}: doppelte ID.`);
    } else {
      shoeIds.add(shoe.id);
    }
  });
  const orphanCount = data.runs.filter((run) => run.shoeId && !shoeIds.has(run.shoeId)).length;
  const settings = normalizeSettings(data.settings || {});
  const warnings = [];
  if (!data.settings) warnings.push("Dieses ältere Backup enthält keine Einstellungen; sichere Standardwerte werden verwendet.");
  if (!data.schemaVersion) warnings.push("Das Backup besitzt keine Schema-Version und wird als älteres Format behandelt.");
  if (orphanCount) warnings.push(`${orphanCount} Laufzuordnungen verweisen auf unbekannte Schuhe.`);
  return { ok: errors.length === 0, errors, orphanCount, warnings, settings };
}
