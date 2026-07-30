import { STORAGE_KEYS } from "./storage.js?v=3.2.5";
import { createRecoverySnapshot } from "./backup.js?v=3.2.5";
import { createUuid } from "./uuid.js?v=3.2.5";

function readLegacyNames() {
  const raw = localStorage.getItem(STORAGE_KEYS.legacyShoes);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new TypeError("Der alte Schuhspeicher enthält kein Array.");
    return value.map((item) => typeof item === "string" ? item : item?.name).filter(Boolean);
  } catch (error) {
    throw new Error(`Alte Schuhdaten konnten nicht sicher gelesen werden: ${error.message}`);
  }
}

export function migrateDatabaseSafely(runs, shoes, settings, appVersion, dbVersion) {
  if (localStorage.getItem(STORAGE_KEYS.shoeMigration) === "1") {
    return { runs, shoes, status: "already-complete", changed: false };
  }

  const legacyNames = readLegacyNames();
  const hasLegacyRunShoes = runs.some((run) => typeof run.shoes === "string" && run.shoes.trim());
  if (!legacyNames.length && !hasLegacyRunShoes) {
    return { runs, shoes, status: "checked-no-data", changed: false };
  }

  createRecoverySnapshot("Vor Datenmigration", appVersion, dbVersion, runs, shoes, settings);
  const nextShoes = structuredClone(shoes);
  const byName = new Map(nextShoes.map((shoe) => [shoe.name.toLocaleLowerCase("de"), shoe]));
  const ensureShoe = (name) => {
    const cleanName = String(name || "").trim();
    if (!cleanName) return null;
    const key = cleanName.toLocaleLowerCase("de");
    if (!byName.has(key)) {
      const shoe = { id: createUuid(), name: cleanName };
      nextShoes.push(shoe);
      byName.set(key, shoe);
    }
    return byName.get(key);
  };
  legacyNames.forEach(ensureShoe);
  const nextRuns = runs.map((run) => {
    if (run.shoeId || !run.shoes) return { ...run };
    const shoe = ensureShoe(run.shoes);
    return { ...run, shoeId: shoe?.id || "" };
  });
  return { runs: nextRuns, shoes: nextShoes, status: "migrated", changed: true };
}
