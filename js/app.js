import {
  STORAGE_KEYS,
  loadRunsSafely as storageLoadRuns,
  loadShoesSafely as storageLoadShoes,
  loadMetadata as storageLoadMetadata,
  saveRunsSafely as storageSaveRuns,
  saveShoesSafely as storageSaveShoes,
  touchMetadata as storageTouchMetadata,
  updateBackupMetadata as storageUpdateBackupMetadata,
  replaceDatabaseSafely,
  getStorageHealth,
  loadSettings,
  saveSettings,
  normalizeSettings,
} from "./storage.js";
import { migrateDatabaseSafely } from "./migration.js";
import {
  createBackupObject as buildBackupObject,
  downloadJson as downloadBackupJson,
  validateBackup,
  createRecoverySnapshot,
  loadRecoveryBackups,
  deleteRecoveryBackup,
  getRecoveryHealth,
} from "./backup.js";
import { average as calculateAverage, clamp as clampNumber, getIsoWeekNumber } from "./statistics.js";
import {
  localDateValue,
  escapeHtml,
  formatPace,
  formatNumber,
  formatDistance,
  formatDuration,
  formatDate,
  formatHeartRate,
  formatCadence,
  formatElevation,
  formatPaceTrend,
} from "./ui.js";
import { filterAndSortRuns, paginateRuns } from "./history.js";
import { groupRunsByShoe } from "./shoes.js";
import { getPeriodSummary } from "./dashboard.js";

const { runs: STORAGE_KEY, shoes: SHOES_KEY, shoeMigration: SHOE_MIGRATION_KEY, metadata: META_KEY } = STORAGE_KEYS;
const APP_VERSION = "3.1.2";
const DB_VERSION = 2;
const BUILD_DATE = "2026.07.29";
const form = document.getElementById("run-form");
const statsGrid = document.getElementById("stats-grid");
const trendText = document.getElementById("trend-text");
const automaticInsights = document.getElementById("automatic-insights");
const runsList = document.getElementById("runs-list");
const weatherBtn = document.getElementById("weather-btn");
const csvExportBtn = document.getElementById("csv-export-btn");
const pdfReportBtn = document.getElementById("pdf-report-btn");
const clearBtn = document.getElementById("clear-btn");
const scoreValue = document.getElementById("score-value");
const scoreLabel = document.getElementById("score-label");
const scoreText = document.getElementById("score-text");
const trendChart = document.getElementById("trend-chart");
const overviewList = document.getElementById("overview-list");
const overviewToggle = document.getElementById("overview-toggle");
const monthFilter = document.getElementById("month-filter");
const routeFilter = document.getElementById("route-filter");
const paceCard = document.getElementById("pace-card");
const cadenceCard = document.getElementById("cadence-card");
const heartRateCard = document.getElementById("heart-rate-card");
const highlightsList = document.getElementById("highlights-list");
const highlightsToggle = document.getElementById("highlights-toggle");
const shoeWearList = document.getElementById("shoe-wear-list");
const hrPaceAnalysis = document.getElementById("hr-pace-analysis");
const bestPerformances = document.getElementById("best-performances");
const shoesSelect = document.getElementById("shoes");
const benchmarkFilter = document.getElementById("benchmark-filter");
const saveRunBtn = document.getElementById("save-run-btn");
const formStatus = document.getElementById("form-status");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const shoeComparisonBody = document.getElementById("shoe-comparison-body");
const manageShoeSelect = document.getElementById("manage-shoe-select");
const renameShoeInput = document.getElementById("rename-shoe-input");
const renameShoeBtn = document.getElementById("rename-shoe-btn");
const mergeShoeSelect = document.getElementById("merge-shoe-select");
const mergeShoeBtn = document.getElementById("merge-shoe-btn");
const removeUnusedShoeBtn = document.getElementById("remove-unused-shoe-btn");
const shoeManagerStatus = document.getElementById("shoe-manager-status");
const addShoeInput = document.getElementById("add-shoe-input");
const addShoeBtn = document.getElementById("add-shoe-btn");
const jsonExportBtn = document.getElementById("json-export-btn");
const jsonImportInput = document.getElementById("json-import-input");
const backupStatus = document.getElementById("backup-status");
const historySearch = document.getElementById("history-search");
const historyShoeFilter = document.getElementById("history-shoe-filter");
const historySort = document.getElementById("history-sort");
const historyPrev = document.getElementById("history-prev");
const historyNext = document.getElementById("history-next");
const historyPage = document.getElementById("history-page");
const historyCount = document.getElementById("history-count");
const dbRuns = document.getElementById("db-runs");
const dbShoes = document.getElementById("db-shoes");
const dbUpdated = document.getElementById("db-updated");
const dbBackup = document.getElementById("db-backup");
const dbHealth = document.getElementById("db-health");
const dbMigration = document.getElementById("db-migration");
const lastRunCompact = document.getElementById("last-run-compact");
const lastRunDetail = document.getElementById("last-run-detail");
const weekCompact = document.getElementById("week-compact");
const weekDetail = document.getElementById("week-detail");
const monthCompact = document.getElementById("month-compact");
const monthDetail = document.getElementById("month-detail");
const themeToggle = document.getElementById("theme-toggle");
const themeSetting = document.getElementById("theme-setting");
const historyPageSizeSetting = document.getElementById("history-page-size-setting");
const recoveryList = document.getElementById("recovery-list");
const recoveryCount = document.getElementById("recovery-count");
const backupDialog = document.getElementById("backup-dialog");
const backupDialogContent = document.getElementById("backup-dialog-content");
const backupDialogActions = document.getElementById("backup-dialog-actions");
const recommendationCompact = document.getElementById("recommendation-compact");
const recommendationDetail = document.getElementById("recommendation-detail");
let historyCurrentPage = 1;
let settings = loadSettings();
let historyPageSize = settings.historyPageSize;
const OVERVIEW_INITIAL_SIZE = 4;
let overviewExpanded = false;
let highlightsExpanded = false;

let runs = loadRuns();
let shoes = loadShoes();
let editingRunId = null;
initializeShoeDatabase();

function buildFilterOptions() {
  const currentMonth = monthFilter.dataset.initialized ? monthFilter.value : settings.monthFilter;
  const currentRoute = routeFilter.dataset.initialized ? routeFilter.value : settings.routeFilter;
  const months = [...new Set(runs.map((run) => new Date(`${run.date}T${run.time || "00:00"}`).toLocaleDateString("de-DE", { month: "long", year: "numeric" })))];
  const routes = [...new Set(runs.map((run) => run.route || "Unbekannt"))];

  monthFilter.innerHTML = '<option value="all">Alle Monate</option>' + months.map((month) => `<option value="${escapeHtml(month)}">${escapeHtml(month)}</option>`).join("");
  routeFilter.innerHTML = '<option value="all">Alle Strecken</option>' + routes.map((route) => `<option value="${escapeHtml(route)}">${escapeHtml(route)}</option>`).join("");

  monthFilter.value = months.includes(currentMonth) ? currentMonth : "all";
  routeFilter.value = routes.includes(currentRoute) ? currentRoute : "all";
  monthFilter.dataset.initialized = "true";
  routeFilter.dataset.initialized = "true";
}

function loadShoes() {
  return storageLoadShoes();
}

function saveShoes() {
  shoes.sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }));
  storageSaveShoes(shoes, APP_VERSION, DB_VERSION);
}

function initializeShoeDatabase() {
  if (localStorage.getItem(SHOE_MIGRATION_KEY) === "1") return;
  const originalStorage = new Map(
    [STORAGE_KEY, SHOES_KEY, META_KEY, STORAGE_KEYS.settings, SHOE_MIGRATION_KEY]
      .map((key) => [key, localStorage.getItem(key)]),
  );
  const originalRuns = structuredClone(runs);
  const originalShoes = structuredClone(shoes);
  try {
    const migrationHealth = getStorageHealth();
    if (["runs", "shoes", "metadata", "settings"].some((area) => migrationHealth[area]?.ok === false)) {
      throw new Error("Migration wurde blockiert, weil mindestens ein vorhandener Speicherbereich beschädigt oder unbekannt ist.");
    }
    const result = migrateDatabaseSafely(runs, shoes, settings, APP_VERSION, DB_VERSION);
    if (result.changed) {
      replaceDatabaseSafely(result.runs, result.shoes, loadMetadata(), APP_VERSION, DB_VERSION, settings);
      runs = result.runs;
      shoes = result.shoes;
    }
    storageTouchMetadata(APP_VERSION, DB_VERSION, {
      migrationStatus: result.status,
      migrationCompletedAt: new Date().toISOString(),
    });
    localStorage.setItem(SHOE_MIGRATION_KEY, "1");
    renderRecoveryBackups();
  } catch (error) {
    runs = originalRuns;
    shoes = originalShoes;
    originalStorage.forEach((value, key) => {
      if (value !== null) localStorage.setItem(key, value);
    });
    console.error("Die Datenmigration ist fehlgeschlagen. Die Originaldaten wurden nicht als erfolgreich migriert markiert.", error);
    if (backupStatus) {
      backupStatus.textContent = `Migration fehlgeschlagen: ${error.message}`;
      backupStatus.classList.add("error");
    }
  }
}

function getShoeById(id) {
  return shoes.find((shoe) => shoe.id === id) || null;
}

function getShoeName(id) {
  return getShoeById(id)?.name || "Kein Schuh zugeordnet";
}

function buildShoeOptions() {
  const currentValue = shoesSelect.value;
  const currentManaged = manageShoeSelect.value;
  const currentMerge = mergeShoeSelect.value;
  const sortedShoes = [...shoes].sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }));

  const options = sortedShoes.map((shoe) => `<option value="${escapeHtml(shoe.id)}">${escapeHtml(shoe.name)}</option>`).join("");
  shoesSelect.innerHTML = '<option value="">Kein Schuh zugeordnet</option>' + options;
  shoesSelect.value = sortedShoes.some((shoe) => shoe.id === currentValue) ? currentValue : "";

  manageShoeSelect.innerHTML = '<option value="">Bitte auswählen</option>' + options;
  manageShoeSelect.value = sortedShoes.some((shoe) => shoe.id === currentManaged) ? currentManaged : "";

  const selectedSource = manageShoeSelect.value;
  mergeShoeSelect.innerHTML = '<option value="">Ziel auswählen</option>' + sortedShoes
    .filter((shoe) => shoe.id !== selectedSource)
    .map((shoe) => `<option value="${escapeHtml(shoe.id)}">${escapeHtml(shoe.name)}</option>`)
    .join("");
  mergeShoeSelect.value = sortedShoes.some((shoe) => shoe.id === currentMerge && shoe.id !== selectedSource) ? currentMerge : "";
}

monthFilter.addEventListener("change", () => { persistSettings({ monthFilter: monthFilter.value }); render(); });
routeFilter.addEventListener("change", () => { persistSettings({ routeFilter: routeFilter.value }); render(); });
benchmarkFilter.addEventListener("change", () => { persistSettings({ benchmarkFilter: benchmarkFilter.value }); render(); });

manageShoeSelect.addEventListener("change", () => {
  renameShoeInput.value = getShoeById(manageShoeSelect.value)?.name || "";
  buildShoeOptions();
});

renameShoeBtn.addEventListener("click", () => renameShoe(manageShoeSelect.value, renameShoeInput.value));
mergeShoeBtn.addEventListener("click", () => mergeShoes(manageShoeSelect.value, mergeShoeSelect.value));
removeUnusedShoeBtn.addEventListener("click", () => removeUnusedShoe(manageShoeSelect.value));
addShoeBtn.addEventListener("click", addShoe);
addShoeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addShoe();
  }
});
cancelEditBtn.addEventListener("click", resetEditMode);

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const rawDuration = parseDuration(document.getElementById("duration").value);
  const distance = parseDistance(document.getElementById("distance").value);
  const selectedShoeId = shoesSelect.value || "";
  const paceInputValue = document.getElementById("pace-input").value.trim();
  const parsedPace = parsePaceInput(paceInputValue);
  const entry = {
    id: editingRunId || crypto.randomUUID(),
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    distance,
    duration: rawDuration,
    paceInput: parsedPace,
    heartRate: Number(document.getElementById("heartRate").value || 0),
    cadence: Number(document.getElementById("cadence").value || 0),
    elevation: Number(document.getElementById("elevation").value || 0),
    feeling: Number(document.getElementById("feeling").value),
    terrain: document.getElementById("terrain").value.trim(),
    location: document.getElementById("location").value.trim(),
    temperature: document.getElementById("temperature").value,
    weather: document.getElementById("weather").value.trim(),
    shoeId: selectedShoeId,
    route: document.getElementById("route").value.trim(),
    notes: document.getElementById("notes").value.trim(),
    pace: Number((paceInputValue ? parsedPace : rawDuration / 60 / distance).toFixed(2)),
  };

  if (!entry.date || entry.distance <= 0 || entry.duration <= 0 || !Number.isFinite(entry.pace) || entry.pace <= 0) {
    formStatus.textContent = "Bitte Datum, Distanz, Dauer und Pace mit gültigen positiven Werten eintragen.";
    formStatus.classList.add("error");
    return;
  }

  const previousRuns = runs;
  if (editingRunId) {
    runs = runs.map((run) => run.id === editingRunId ? entry : run);
  } else {
    runs = [...runs, entry];
  }

  try {
    sortRuns();
    saveRuns();
  } catch (error) {
    runs = previousRuns;
    console.error("Lauf konnte nicht gespeichert werden.", error);
    formStatus.textContent = error.message;
    formStatus.classList.add("error");
    return;
  }
  formStatus.textContent = editingRunId ? "Änderungen wurden gespeichert." : "Lauf wurde gespeichert.";
  formStatus.classList.remove("error");
  resetEditMode();
  render();
});

weatherBtn.addEventListener("click", async (event) => {
  event.preventDefault();
  const locationInput = document.getElementById("location");
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const tempInput = document.getElementById("temperature");
  const weatherInput = document.getElementById("weather");

  const locationText = locationInput.value.trim();
  const dateText = dateInput.value;
  const timeText = timeInput.value || "12:00";

  if (!dateText) {
    weatherInput.value = "Bitte zuerst ein Datum wählen.";
    return;
  }

  try {
    const coords = await resolveCoordinates(locationText);
    const weatherData = await fetchWeather(coords, dateText, timeText);
    tempInput.value = weatherData.temperature;
    weatherInput.value = weatherData.label;
  } catch {
    weatherInput.value = "Wetter konnte nicht geladen werden.";
  }
});

csvExportBtn.addEventListener("click", exportRunsAsCsv);
pdfReportBtn.addEventListener("click", openPdfReport);

clearBtn.addEventListener("click", () => {
  if (!runs.length) return;
  if (!window.confirm("Alle Laufdaten wirklich löschen? Es wird vorher eine JSON- und Recovery-Sicherung erstellt.")) return;
  const phrase = window.prompt('Zum endgültigen Löschen bitte "LÄUFE LÖSCHEN" eingeben.');
  if (phrase !== "LÄUFE LÖSCHEN") return;
  if (!createAutomaticRecovery("Vor Löschen aller Läufe")) return;
  exportBackup(true);
  runs = [];
  saveRuns();
  historyCurrentPage = 1;
  render();
  renderRecoveryBackups();
});

function exportRunsAsCsv() {
  if (!runs.length) {
    window.alert("Es sind noch keine Läufe für den Export vorhanden.");
    return;
  }

  const headers = [
    "Datum", "Uhrzeit", "Distanz_km", "Dauer", "Pace_min_km", "Herzfrequenz_bpm",
    "Kadenz_spm", "Hoehenmeter_m", "Gefuehl_1_bis_5", "Schuh", "Untergrund",
    "Ort", "Temperatur_C", "Wetter", "Route", "Notizen"
  ];

  const rows = [...runs]
    .sort((a, b) => new Date(`${a.date}T${a.time || "00:00"}`) - new Date(`${b.date}T${b.time || "00:00"}`))
    .map((run) => [
      formatDate(run.date),
      run.time || "",
      formatCsvNumber(run.distance),
      formatDuration(run.duration || 0),
      formatPace(run.pace),
      run.heartRate || "",
      run.cadence || "",
      run.elevation || 0,
      run.feeling || "",
      getShoeName(run.shoeId),
      run.terrain || "",
      run.location || "",
      run.temperature !== "" ? formatCsvNumber(run.temperature) : "",
      run.weather || "",
      run.route || "",
      run.notes || ""
    ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(";"))
    .join("\r\n");
  downloadTextFile(`lauftracking-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
}

function openPdfReport() {
  if (!runs.length) {
    window.alert("Es sind noch keine Läufe für einen Analysebericht vorhanden.");
    return;
  }

  const reportRuns = [...runs].sort((a, b) => new Date(`${b.date}T${b.time || "00:00"}`) - new Date(`${a.date}T${a.time || "00:00"}`));
  const totalDistance = reportRuns.reduce((sum, run) => sum + Number(run.distance || 0), 0);
  const avgPace = average(reportRuns.map((run) => Number(run.pace)).filter((value) => value > 0));
  const avgHeartRate = average(reportRuns.map((run) => Number(run.heartRate)).filter(Boolean));
  const avgCadence = average(reportRuns.map((run) => Number(run.cadence)).filter(Boolean));
  const highestCadence = Math.max(...reportRuns.map((run) => Number(run.cadence || 0)));
  const heartRates = reportRuns.map((run) => Number(run.heartRate)).filter(Boolean);
  const lowestHeartRate = heartRates.length ? Math.min(...heartRates) : 0;
  const generatedOn = formatDate(new Date());
  const reportInsights = renderAutomaticInsights(reportRuns);
  const reportRecords = renderBestPerformances(reportRuns);
  const chart = renderTrendChart(reportRuns).replaceAll('fill="#8ea1b8"', 'fill="#4b5563"').replaceAll('stroke="rgba(255,255,255,0.15)"', 'stroke="#d1d5db"');
  const shoeRows = buildShoeComparisonRows(reportRuns);
  const recentRows = reportRuns.slice(0, 12).map((run) => `
    <tr>
      <td>${escapeHtml(formatRunDate(run))}</td>
      <td>${formatDistance(run.distance)}</td>
      <td>${formatPace(run.pace)} min/km</td>
      <td>${formatHeartRate(run.heartRate)}</td>
      <td>${formatCadence(run.cadence)}</td>
      <td>${escapeHtml(getShoeName(run.shoeId))}</td>
    </tr>`).join("");

  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    window.alert("Der Analysebericht konnte nicht geöffnet werden. Bitte Pop-ups für diese Seite erlauben.");
    return;
  }

  reportWindow.document.write(`<!DOCTYPE html>
  <html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Laufanalyse ${generatedOn}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,sans-serif;color:#172033;margin:0;padding:28px;background:#fff}
    h1{margin:0 0 6px;font-size:28px} h2{margin:28px 0 12px;font-size:18px} p{color:#4b5563}
    .meta{margin:0 0 22px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{border:1px solid #d9dee7;border-radius:10px;padding:12px}.card span{display:block;color:#667085;font-size:12px;margin-bottom:5px}.card strong{font-size:18px}
    .chart{border:1px solid #d9dee7;border-radius:10px;padding:12px}.chart svg{width:100%;max-height:280px}
    table{width:100%;border-collapse:collapse;font-size:12px} th,td{text-align:left;border-bottom:1px solid #e5e7eb;padding:7px 6px} th{background:#f3f5f8}
    .actions{margin-bottom:20px}.actions button{padding:10px 14px;border:0;border-radius:999px;background:#172033;color:#fff;font-weight:700;cursor:pointer}
    .automatic-insights,.highlights-list{display:grid;gap:8px}.insight-message,.highlight-item{border:1px solid #d9dee7;border-radius:9px;padding:10px 12px}.insight-message{border-left:4px solid #667085}.insight-message.positive{border-left-color:#158f78}.insight-message.attention{border-left-color:#c27a14}.insight-message strong,.insight-message span{display:block}.insight-message span,.highlight-item div{color:#4b5563;margin-top:4px}
    @media print{body{padding:0}.actions{display:none} h2{break-after:avoid}.chart,table{break-inside:avoid}}
  </style></head><body>
  <div class="actions"><button onclick="window.print()">Drucken / als PDF speichern</button></div>
  <h1>Persönliche Laufanalyse</h1><p class="meta">Erstellt am ${generatedOn} · ${reportRuns.length} Läufe</p>
  <div class="cards">
    <div class="card"><span>Gesamtstrecke</span><strong>${formatDistance(totalDistance)}</strong></div>
    <div class="card"><span>Ø Pace</span><strong>${formatPace(avgPace)} min/km</strong></div>
    <div class="card"><span>Ø Herzfrequenz</span><strong>${formatHeartRate(avgHeartRate)}</strong></div>
    <div class="card"><span>Ø Kadenz</span><strong>${formatCadence(avgCadence)}</strong></div>
    <div class="card"><span>Höchste Kadenz</span><strong>${formatCadence(highestCadence)}</strong></div>
    <div class="card"><span>Niedrigste Ø HF</span><strong>${formatHeartRate(lowestHeartRate)}</strong></div>
  </div>
  <h2>Automatische Erkenntnisse</h2><div class="automatic-insights">${reportInsights}</div>
  <h2>Persönliche Rekorde</h2><div class="highlights-list">${reportRecords}</div>
  <h2>Trend der letzten Läufe</h2><div class="chart">${chart}</div>
  <h2>Schuhvergleich</h2><table><thead><tr><th>Schuh</th><th>Läufe</th><th>km</th><th>Ø Pace</th><th>Ø HF</th><th>Ø Kadenz</th></tr></thead><tbody>${shoeRows}</tbody></table>
  <h2>Letzte Läufe</h2><table><thead><tr><th>Datum</th><th>Distanz</th><th>Pace</th><th>HF</th><th>Kadenz</th><th>Schuh</th></tr></thead><tbody>${recentRows}</tbody></table>
  </body></html>`);
  reportWindow.document.close();
  reportWindow.focus();
}

function buildShoeComparisonRows(sourceRuns) {
  return groupRunsByShoe(sourceRuns, getShoeName).sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" })).map((item) => `
    <tr><td>${escapeHtml(item.name)}</td><td>${item.runs}</td><td>${formatDistance(item.distance, false)}</td><td>${item.paces.length ? `${formatPace(average(item.paces))} min/km` : "–"}</td><td>${formatHeartRate(average(item.heartRates))}</td><td>${formatCadence(average(item.cadences))}</td></tr>`).join("");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function formatCsvNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number).replace(".", ",") : "";
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function loadRuns() {
  return storageLoadRuns();
}

function saveRuns() {
  storageSaveRuns(runs, APP_VERSION, DB_VERSION);
}

function render() {
  buildFilterOptions();
  buildShoeOptions();
  renderStats();
  renderRuns();
  renderCompactCards();
}

function renderCompactCards() {
  const latest = runs[0];
  const summary = getPeriodSummary(runs);
  if (lastRunCompact) lastRunCompact.textContent = latest ? `${formatDistance(latest.distance)} · ${formatPace(latest.pace)} min/km` : "Noch kein Lauf";
  if (lastRunDetail) lastRunDetail.textContent = latest ? formatRunDate(latest) : "–";
  if (weekCompact) weekCompact.textContent = formatDistance(summary.weekDistance);
  if (weekDetail) weekDetail.textContent = `${summary.weekRuns.length} ${summary.weekRuns.length === 1 ? "Lauf" : "Läufe"}`;
  if (monthCompact) monthCompact.textContent = formatDistance(summary.monthDistance);
  if (monthDetail) monthDetail.textContent = `${summary.monthRuns.length} ${summary.monthRuns.length === 1 ? "Lauf" : "Läufe"}`;
  if (recommendationCompact && recommendationDetail) {
    if (!runs.length) {
      recommendationCompact.textContent = "Noch keine Empfehlung";
      recommendationDetail.textContent = "Entsteht aus deinen vorhandenen Läufen.";
    } else {
      const latestDistance = Number(latest.distance || 0);
      const latestFeeling = Number(latest.feeling || 3);
      const suggestedDistance = latestFeeling <= 2 ? Math.max(2, latestDistance * .7) : Math.max(3, latestDistance * .9);
      recommendationCompact.textContent = latestFeeling <= 2 ? "Locker und kürzer laufen" : "Ruhiger Grundlagenlauf";
      recommendationDetail.textContent = `Etwa ${formatDistance(suggestedDistance)} auf Basis deines letzten Laufs.`;
    }
  }
}

function renderStats() {
  if (!runs.length) {
    statsGrid.innerHTML = "";
    trendText.textContent = "Noch keine Daten vorhanden. Speichere deinen ersten Lauf, damit die Analyse sichtbar wird.";
    automaticInsights.innerHTML = '<div class="insight-message neutral"><strong>Noch keine Erkenntnisse</strong><span>Nach einigen Läufen werden hier automatisch Veränderungen erkannt.</span></div>';
    trendChart.innerHTML = '<p class="empty-state">Noch keine Daten für die Visualisierung.</p>';
    overviewList.innerHTML = '<div class="empty-state">Noch keine Daten vorhanden.</div>';
    if (overviewToggle) overviewToggle.hidden = true;
    highlightsList.innerHTML = renderHighlights([]);
    shoeWearList.innerHTML = '<div class="wear-item"><div><strong>Keine Daten</strong></div></div>';
    shoeComparisonBody.innerHTML = '<tr><td colspan="6">Noch keine Daten vorhanden.</td></tr>';
    bestPerformances.innerHTML = '<div class="highlight-item"><strong>Keine Daten</strong><div>Speichere erst Läufe.</div></div>';
    hrPaceAnalysis.textContent = "Noch keine Daten für einen Vergleich.";
    paceCard.textContent = "–";
    cadenceCard.textContent = "–";
    heartRateCard.textContent = "–";
    scoreValue.textContent = "–";
    scoreLabel.textContent = "Noch keine Bewertung";
    scoreText.textContent = "Speichere ein paar Läufe, damit dein Trainings-Score sichtbar wird.";
    return;
  }

  const filteredRuns = filterRuns(runs);
  const totalRuns = filteredRuns.length;
  const benchmarkLabel = benchmarkFilter.value === "5k" ? "Schnellster 5-km-Lauf" : benchmarkFilter.value === "10k" ? "Schnellster 10-km-Lauf" : "Schnellster Lauf";
  const totalDistance = filteredRuns.reduce((sum, run) => sum + run.distance, 0);
  const avgDistance = totalRuns ? totalDistance / totalRuns : 0;
  const avgPace = average(filteredRuns.map((run) => Number(run.pace)).filter((value) => value > 0));
  const bestPace = filteredRuns.length ? Math.min(...filteredRuns.map((run) => Number(run.pace)).filter((value) => value > 0)) : 0;
  const longestRun = filteredRuns.length ? Math.max(...filteredRuns.map((run) => Number(run.distance || 0))) : 0;
  const avgHeartRate = average(filteredRuns.map((run) => Number(run.heartRate)).filter((value) => value > 0));
  const avgCadence = average(filteredRuns.map((run) => Number(run.cadence)).filter((value) => value > 0));
  const totalElevation = filteredRuns.reduce((sum, run) => sum + run.elevation, 0);
  const recent = filteredRuns.slice(0, 3);
  const older = filteredRuns.slice(-3);
  const recentAvg = average(recent.map((run) => run.pace));
  const olderAvg = average(older.map((run) => run.pace));
  const score = buildScore(filteredRuns);

  let trend = "Die Entwicklung ist stabil.";
  if (recentAvg < olderAvg) {
    trend = `Deine durchschnittliche Pace ist ${formatPaceTrend(olderAvg - recentAvg)} geworden.`;
  } else if (recentAvg > olderAvg) {
    trend = `Die letzten Einträge sind etwas langsamer. Das ist kein Problem – gerade in Belastungsphasen ist das normal.`;
  }

  statsGrid.innerHTML = `
    <div class="stat-card">
      <h3>Läufe</h3>
      <div class="stat-value">${totalRuns}</div>
    </div>
    <div class="stat-card">
      <h3>Gesamtstrecke</h3>
      <div class="stat-value">${formatDistance(totalDistance)}</div>
    </div>
    <div class="stat-card">
      <h3>Ø Distanz</h3>
      <div class="stat-value">${formatDistance(avgDistance)}</div>
    </div>
    <div class="stat-card">
      <h3>Ø Pace</h3>
      <div class="stat-value">${formatPace(avgPace)} min/km</div>
    </div>
    <div class="stat-card">
      <h3>${benchmarkLabel}</h3>
      <div class="stat-value">${formatPace(bestPace)} min/km</div>
    </div>
    <div class="stat-card">
      <h3>Längster Lauf</h3>
      <div class="stat-value">${formatDistance(longestRun)}</div>
    </div>
    <div class="stat-card">
      <h3>Ø Herzfrequenz</h3>
      <div class="stat-value">${formatHeartRate(avgHeartRate)}</div>
    </div>
    <div class="stat-card">
      <h3>Ø Kadenz</h3>
      <div class="stat-value">${formatCadence(avgCadence)}</div>
    </div>
    <div class="stat-card">
      <h3>Höhenmeter</h3>
      <div class="stat-value">${formatElevation(totalElevation)}</div>
    </div>
  `;

  scoreValue.textContent = `${score.value}/100`;
  scoreLabel.textContent = score.label;
  scoreText.textContent = score.text;
  trendText.textContent = trend;
  automaticInsights.innerHTML = renderAutomaticInsights(filteredRuns);
  trendChart.innerHTML = renderTrendChart(filteredRuns);
  overviewList.innerHTML = renderOverview(filteredRuns);
  highlightsList.innerHTML = renderHighlights(filteredRuns);
  shoeWearList.innerHTML = renderShoeWear(filteredRuns);
  hrPaceAnalysis.textContent = renderHrPaceAnalysis(filteredRuns);
  bestPerformances.innerHTML = renderBestPerformances(filteredRuns);
  shoeComparisonBody.innerHTML = renderShoeComparison(filteredRuns);
  paceCard.textContent = `${formatPace(avgPace)} min/km`;
  cadenceCard.textContent = formatCadence(avgCadence);
  heartRateCard.textContent = formatHeartRate(avgHeartRate);
}

function average(values) {
  return calculateAverage(values);
}

function clamp(value, min, max) {
  return clampNumber(value, min, max);
}

function buildScore(runs) {
  if (!runs.length) {
    return { value: 0, label: "Noch keine Bewertung", text: "Speichere ein paar Läufe, damit dein Trainings-Score sichtbar wird." };
  }

  const paceValues = runs.map((run) => run.pace);
  const avgPace = average(paceValues);
  const cadenceValues = runs.map((run) => run.cadence).filter(Boolean);
  const avgCadence = cadenceValues.length ? average(cadenceValues) : 0;
  const recent = runs.slice(0, 3);
  const older = runs.slice(-3);
  const recentAvg = average(recent.map((run) => run.pace));
  const olderAvg = average(older.map((run) => run.pace));
  const improvement = olderAvg ? (olderAvg - recentAvg) / olderAvg : 0;

  const paceScore = clamp(100 - (avgPace - 5.2) * 12, 0, 100);
  const cadenceScore = avgCadence ? clamp(100 - Math.abs(avgCadence - 170) * 0.8, 0, 100) : 70;
  const consistencyScore = clamp(100 - Math.max(0, (average(paceValues.map((value) => Math.abs(value - avgPace))) * 6)), 0, 100);
  const trendScore = clamp(50 + improvement * 100, 0, 100);

  const value = Math.round((paceScore * 0.4 + cadenceScore * 0.3 + (consistencyScore * 0.15 + trendScore * 0.15)));

  if (value >= 85) {
    return { value, label: "Sehr guter Laufstatus", text: `Deine Werte sind stark. Pace, Kadenz und Konstanz passen gut zusammen.` };
  }
  if (value >= 70) {
    return { value, label: "Guter Trainingsfortschritt", text: `Das ist ein solides Fundament. Kleine Optimierungen bei Pace oder Kadenz könnten noch helfen.` };
  }
  return { value, label: "Noch Raum für Verbesserung", text: `Die Daten zeigen, dass du noch an Konstanz und Effizienz arbeiten kannst.` };
}

function filterRuns(sourceRuns) {
  const monthValue = monthFilter.value;
  const routeValue = routeFilter.value;
  const benchmarkValue = benchmarkFilter.value;
  return sourceRuns.filter((run) => {
    const date = new Date(`${run.date}T${run.time || "00:00"}`);
    const monthLabel = date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const matchesMonth = monthValue === "all" || monthLabel === monthValue;
    const routeLabel = run.route || "Unbekannt";
    const matchesRoute = routeValue === "all" || routeLabel === routeValue;
    const matchesBenchmark = benchmarkValue === "all" || isBenchmarkMatch(run.distance, benchmarkValue);
    return matchesMonth && matchesRoute && matchesBenchmark;
  });
}

function isBenchmarkMatch(distance, benchmarkValue) {
  if (benchmarkValue === "5k") return distance >= 4.5 && distance <= 5.5;
  if (benchmarkValue === "10k") return distance >= 9.5 && distance <= 10.5;
  if (benchmarkValue === "15k") return distance >= 14.5 && distance <= 15.5;
  return true;
}

function renderTrendChart(runs) {
  const series = runs.slice(0, 8).reverse();
  if (!series.length) {
    return '<p class="empty-state">Noch keine Daten für die Visualisierung.</p>';
  }

  const maxDistance = Math.max(...series.map((run) => run.distance), 1);
  const maxPace = Math.max(...series.map((run) => run.pace), 1);
  const heartRates = series.map((run) => Number(run.heartRate)).filter((value) => value > 0);
  const minHeartRate = heartRates.length ? Math.min(...heartRates) : 0;
  const heartRateRange = heartRates.length ? Math.max(...heartRates) - minHeartRate : 0;
  const width = 340;
  const height = 220;
  const padding = 24;
  const plotBottom = height - 48;

  const points = series.map((run, index) => {
    const x = padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
    const distanceY = plotBottom - ((run.distance / maxDistance) * 90);
    const paceY = plotBottom - ((run.pace / maxPace) * 90);
    const heartRate = Number(run.heartRate);
    const heartRateY = heartRate > 0
      ? plotBottom - 10 - (((heartRate - minHeartRate) / (heartRateRange || 1)) * 70)
      : null;
    return { x, distanceY, paceY, heartRate, heartRateY, label: formatDate(run.date) };
  });

  const pathDistance = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.distanceY.toFixed(1)}`).join(" ");
  const pathPace = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.paceY.toFixed(1)}`).join(" ");
  const pathHeartRate = points.reduce((path, point, index) => {
    if (point.heartRateY === null) return path;
    const previousHasHeartRate = index > 0 && points[index - 1].heartRateY !== null;
    return `${path}${previousHasHeartRate ? " L" : " M"}${point.x.toFixed(1)},${point.heartRateY.toFixed(1)}`;
  }, "");
  const heartRatePoints = points
    .filter((point) => point.heartRateY !== null)
    .map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.heartRateY.toFixed(1)}" r="3" fill="#ff6b7a"><title>${point.heartRate} bpm</title></circle>`)
    .join("");

  const labels = points.map((point) => `<text x="${point.x.toFixed(1)}" y="${plotBottom + 17}" text-anchor="middle" font-size="9" fill="#8ea1b8" transform="rotate(-45 ${point.x.toFixed(1)} ${plotBottom + 17})">${point.label}</text>`).join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Visualisierung von Distanz, Pace und Herzfrequenz">
      <line x1="${padding}" y1="${plotBottom}" x2="${width - padding}" y2="${plotBottom}" stroke="#c7d2e3" stroke-width="1"></line>
      <path d="${pathDistance}" fill="none" stroke="#56d1b4" stroke-width="2.5"></path>
      <path d="${pathPace}" fill="none" stroke="#7ad7ff" stroke-width="2.5"></path>
      ${pathHeartRate ? `<path d="${pathHeartRate}" fill="none" stroke="#ff6b7a" stroke-width="2.5"></path>` : ""}
      ${heartRatePoints}
      ${labels}
      <text x="${width / 2}" y="${height - 5}" text-anchor="middle" font-size="10" font-weight="700" fill="#667085">Datum der letzten Läufe</text>
    </svg>
  `;
}

function renderShoeWear(runs) {
  if (!runs.length) {
    return '<div class="wear-item"><div><strong>Keine Daten</strong><div>Speichere erst Läufe, um den Verschleiß zu sehen.</div></div></div>';
  }

  const grouped = runs.reduce((acc, run) => {
    const shoeName = getShoeName(run.shoeId);
    if (!acc[shoeName]) {
      acc[shoeName] = { name: shoeName, distance: 0, runs: 0 };
    }
    acc[shoeName].distance += run.distance;
    acc[shoeName].runs += 1;
    return acc;
  }, {});

  return Object.values(grouped)
    .sort((a, b) => b.distance - a.distance)
    .map((entry) => {
      const state = entry.distance >= 400 ? "stark getragen" : entry.distance >= 250 ? "mittel" : "noch neu";
      const icon = entry.distance >= 400 ? "🟠" : entry.distance >= 250 ? "🟡" : "🟢";
      return `<div class="wear-item"><div><strong>${escapeHtml(entry.name)}</strong><div>${entry.runs} Läufe · ${formatDistance(entry.distance)}</div></div><span class="wear-pill">${icon} ${state}</span></div>`;
    })
    .join("");
}

function renderBestPerformances(runs) {
  if (!runs.length) {
    return '<div class="highlight-item"><strong>Keine Daten</strong><div>Speichere erst Läufe.</div></div>';
  }

  const validPace = runs.filter((run) => Number(run.pace) > 0);
  const best5k = [...runs].filter((run) => run.distance >= 4.5 && run.distance <= 5.5).sort((a, b) => a.duration - b.duration)[0];
  const best10k = [...runs].filter((run) => run.distance >= 9.5 && run.distance <= 10.5).sort((a, b) => a.duration - b.duration)[0];
  const best15k = [...runs].filter((run) => run.distance >= 14.5 && run.distance <= 15.5).sort((a, b) => a.duration - b.duration)[0];
  const fastestRun = [...validPace].sort((a, b) => a.pace - b.pace)[0];
  const longestRun = [...runs].sort((a, b) => b.distance - a.distance)[0];
  const longestDuration = [...runs].sort((a, b) => b.duration - a.duration)[0];
  const highestCadence = [...runs].filter((run) => run.cadence > 0).sort((a, b) => b.cadence - a.cadence)[0];
  const lowestHeartRate = [...runs].filter((run) => run.heartRate > 0).sort((a, b) => a.heartRate - b.heartRate)[0];
  const mostElevation = [...runs].filter((run) => run.elevation > 0).sort((a, b) => b.elevation - a.elevation)[0];
  const bestMonth = getBestMonth(runs);

  return `
    <div class="highlight-item"><strong>Schnellster 5-km-Lauf</strong><div>${best5k ? `${formatDuration(best5k.duration)} · ${formatPace(best5k.pace)} min/km · ${formatRunDate(best5k)}` : "–"}</div></div>
    <div class="highlight-item"><strong>Schnellster 10-km-Lauf</strong><div>${best10k ? `${formatDuration(best10k.duration)} · ${formatPace(best10k.pace)} min/km · ${formatRunDate(best10k)}` : "–"}</div></div>
    <div class="highlight-item"><strong>Schnellster 15-km-Lauf</strong><div>${best15k ? `${formatDuration(best15k.duration)} · ${formatPace(best15k.pace)} min/km · ${formatRunDate(best15k)}` : "–"}</div></div>
    <div class="highlight-item"><strong>Beste Pace</strong><div>${fastestRun ? `${formatPace(fastestRun.pace)} min/km · ${formatDistance(fastestRun.distance)} · ${formatRunDate(fastestRun)}` : "–"}</div></div>
    <div class="highlight-item"><strong>Längster Lauf</strong><div>${longestRun ? `${formatDistance(longestRun.distance)} · ${formatDuration(longestRun.duration)} · ${formatRunDate(longestRun)}` : "–"}</div></div>
    <div class="highlight-item"><strong>Längste Laufzeit</strong><div>${longestDuration ? `${formatDuration(longestDuration.duration)} · ${formatDistance(longestDuration.distance)} · ${formatRunDate(longestDuration)}` : "–"}</div></div>
    <div class="highlight-item"><strong>Höchste Kadenz</strong><div>${highestCadence ? `${formatCadence(highestCadence.cadence)} · ${formatRunDate(highestCadence)}` : "–"}</div></div>
    <div class="highlight-item"><strong>Niedrigste Ø Herzfrequenz</strong><div>${lowestHeartRate ? `${formatHeartRate(lowestHeartRate.heartRate)} · ${formatPace(lowestHeartRate.pace)} min/km · ${formatRunDate(lowestHeartRate)}` : "–"}</div></div>
    <div class="highlight-item"><strong>Meiste Höhenmeter</strong><div>${mostElevation ? `${formatElevation(mostElevation.elevation)} · ${formatDistance(mostElevation.distance)} · ${formatRunDate(mostElevation)}` : "–"}</div></div>
    <div class="highlight-item"><strong>Stärkster Monat</strong><div>${bestMonth ? `${bestMonth.label} · ${formatDistance(bestMonth.distance)} in ${bestMonth.runs} Läufen` : "–"}</div></div>
  `;
}

function getBestMonth(runs) {
  const months = new Map();
  runs.forEach((run) => {
    const date = new Date(`${run.date}T${run.time || "00:00"}`);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!months.has(key)) {
      months.set(key, {
        label: date.toLocaleDateString("de-DE", { month: "long", year: "numeric" }),
        distance: 0,
        runs: 0,
      });
    }
    const month = months.get(key);
    month.distance += Number(run.distance || 0);
    month.runs += 1;
  });
  return [...months.values()].sort((a, b) => b.distance - a.distance)[0] || null;
}

function renderAutomaticInsights(sourceRuns) {
  const chronological = [...sourceRuns].sort((a, b) => new Date(`${a.date}T${a.time || "00:00"}`) - new Date(`${b.date}T${b.time || "00:00"}`));
  if (chronological.length < 4) {
    return '<div class="insight-message neutral"><strong>Noch zu wenig Vergleichsdaten</strong><span>Ab vier Läufen werden erste Trends sichtbar; ab sechs bis zehn Läufen werden sie deutlich verlässlicher.</span></div>';
  }

  const comparisonSize = Math.min(5, Math.floor(chronological.length / 2));
  const older = chronological.slice(0, comparisonSize);
  const recent = chronological.slice(-comparisonSize);
  const messages = [];

  const olderPace = average(older.map((run) => Number(run.pace)).filter((value) => value > 0));
  const recentPace = average(recent.map((run) => Number(run.pace)).filter((value) => value > 0));
  if (olderPace && recentPace) {
    const paceDelta = olderPace - recentPace;
    const seconds = Math.round(paceDelta * 60);
    if (Math.abs(seconds) >= 5) {
      messages.push({
        type: seconds > 0 ? "positive" : "attention",
        title: seconds > 0 ? "Pace verbessert" : "Pace zuletzt langsamer",
        text: seconds > 0
          ? `Deine letzten ${comparisonSize} Läufe waren im Schnitt ${formatPace(Math.abs(paceDelta))} min/km schneller als die ersten ${comparisonSize} Vergleichsläufe.`
          : `Deine letzten ${comparisonSize} Läufe waren im Schnitt ${formatPace(Math.abs(paceDelta))} min/km langsamer. Das kann durch bewusst lockere Läufe, Wetter oder Müdigkeit entstehen.`,
      });
    }
  }

  const olderHr = older.filter((run) => run.heartRate > 0);
  const recentHr = recent.filter((run) => run.heartRate > 0);
  if (olderHr.length >= 2 && recentHr.length >= 2) {
    const oldEfficiency = average(olderHr.map((run) => run.heartRate * run.pace));
    const newEfficiency = average(recentHr.map((run) => run.heartRate * run.pace));
    const percent = oldEfficiency ? ((oldEfficiency - newEfficiency) / oldEfficiency) * 100 : 0;
    if (Math.abs(percent) >= 2) {
      messages.push({
        type: percent > 0 ? "positive" : "attention",
        title: percent > 0 ? "Laufökonomie verbessert" : "Höhere Belastung erkennbar",
        text: percent > 0
          ? `Das Verhältnis aus Pace und Herzfrequenz hat sich um etwa ${formatNumber(percent)} % verbessert. Du benötigst für dein Tempo tendenziell weniger Belastung.`
          : `Das Verhältnis aus Pace und Herzfrequenz ist um etwa ${formatNumber(Math.abs(percent))} % ungünstiger geworden. Beobachte Erholung, Wetter und Streckenprofil.`,
      });
    }
  }

  const oldCadence = average(older.map((run) => Number(run.cadence)).filter((value) => value > 0));
  const newCadence = average(recent.map((run) => Number(run.cadence)).filter((value) => value > 0));
  if (oldCadence && newCadence && Math.abs(newCadence - oldCadence) >= 2) {
    const delta = Math.round(newCadence - oldCadence);
    messages.push({
      type: "neutral",
      title: "Kadenz verändert",
      text: `Deine durchschnittliche Kadenz liegt zuletzt ${Math.abs(delta)} Schritte pro Minute ${delta > 0 ? "höher" : "niedriger"}. Das ist zunächst eine Beobachtung, keine automatische Qualitätsbewertung.`,
    });
  }

  const olderDistance = average(older.map((run) => Number(run.distance || 0)));
  const recentDistance = average(recent.map((run) => Number(run.distance || 0)));
  if (olderDistance && recentDistance) {
    const change = ((recentDistance - olderDistance) / olderDistance) * 100;
    if (Math.abs(change) >= 10) {
      messages.push({
        type: Math.abs(change) > 30 ? "attention" : "neutral",
        title: change > 0 ? "Laufumfang gestiegen" : "Laufumfang gesunken",
        text: `Die durchschnittliche Distanz deiner letzten Läufe ist um ${formatNumber(Math.abs(change))} % ${change > 0 ? "gestiegen" : "gesunken"}. ${change > 30 ? "Ein großer Sprung sollte bewusst und beschwerdefrei erfolgen." : "Die Veränderung ist moderat."}`,
      });
    }
  }

  const recentFeelings = recent.map((run) => Number(run.feeling)).filter(Boolean);
  const olderFeelings = older.map((run) => Number(run.feeling)).filter(Boolean);
  if (recentFeelings.length >= 2 && olderFeelings.length >= 2) {
    const delta = average(recentFeelings) - average(olderFeelings);
    if (Math.abs(delta) >= 0.5) {
      messages.push({
        type: delta > 0 ? "positive" : "attention",
        title: delta > 0 ? "Besseres Laufgefühl" : "Läufe fühlen sich schwerer an",
        text: `Deine subjektive Bewertung ist zuletzt im Schnitt um ${formatNumber(Math.abs(delta), 1)} Punkte ${delta > 0 ? "gestiegen" : "gesunken"}.`,
      });
    }
  }

  const last30 = chronological.filter((run) => {
    const age = Date.now() - new Date(`${run.date}T${run.time || "00:00"}`).getTime();
    return age >= 0 && age <= 30 * 24 * 60 * 60 * 1000;
  });
  if (last30.length) {
    messages.push({
      type: "neutral",
      title: "Letzte 30 Tage",
      text: `${last30.length} Läufe · ${formatDistance(last30.reduce((sum, run) => sum + Number(run.distance || 0), 0))} · Ø Pace ${formatPace(average(last30.map((run) => run.pace).filter(Boolean)))} min/km.`,
    });
  }

  if (!messages.length) {
    messages.push({ type: "neutral", title: "Stabile Entwicklung", text: "Zwischen den älteren und den letzten Läufen gibt es derzeit keine deutliche Veränderung. Konstanz ist ebenfalls ein Fortschritt." });
  }

  return messages.slice(0, 6).map((message) => `
    <div class="insight-message ${message.type}">
      <strong>${escapeHtml(message.title)}</strong>
      <span>${escapeHtml(message.text)}</span>
    </div>`).join("");
}

function renderShoeComparison(sourceRuns) {
  if (!sourceRuns.length) return '<tr><td colspan="6">Noch keine Daten vorhanden.</td></tr>';

  return groupRunsByShoe(sourceRuns, getShoeName)
    .sort((a, b) => b.distance - a.distance)
    .map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${item.runs}</td>
        <td>${formatDistance(item.distance, false)}</td>
        <td>${item.paces.length ? `${formatPace(average(item.paces))} min/km` : "–"}</td>
        <td>${formatHeartRate(average(item.heartRates))}</td>
        <td>${formatCadence(average(item.cadences))}</td>
      </tr>`)
    .join("");
}

function renderHrPaceAnalysis(runs) {
  if (!runs.length) {
    return "Noch keine Daten für einen Vergleich.";
  }

  const withData = runs.filter((run) => run.heartRate && run.pace);
  if (!withData.length) {
    return "Für diese Analyse braucht es Herzfrequenz und Pace.";
  }

  const recent = withData.slice(0, 3);
  const older = withData.slice(-3);
  const recentAvg = average(recent.map((run) => run.heartRate / run.pace));
  const olderAvg = average(older.map((run) => run.heartRate / run.pace));
  const delta = olderAvg ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

  if (delta < -5) {
    return `Deine Herzfrequenz bei derselben Pace ist im Schnitt ${formatNumber(Math.abs(delta))} % besser geworden.`;
  }
  if (delta > 5) {
    return `Deine Herzfrequenz bei derselben Pace ist im Schnitt ${formatNumber(delta)} % angestiegen. Das kann auf mehr Belastung hinweisen.`;
  }
  return "Dein HF/Pace-Verhältnis ist stabil geblieben.";
}

function renderHighlights(runs) {
  if (!runs.length) {
    if (highlightsToggle) highlightsToggle.hidden = true;
    return '<div class="empty-state">Speichere erst Läufe, damit Trainings-Highlights berechnet werden können.</div>';
  }

  const chronological = [...runs].sort((a, b) => runTimestamp(a) - runTimestamp(b));
  const validPace = runs.filter((run) => Number(run.pace) > 0);
  const validHeartRate = runs.filter((run) => Number(run.heartRate) > 0);
  const validCadence = runs.filter((run) => Number(run.cadence) > 0);
  const validElevation = runs.filter((run) => Number(run.elevation) > 0);
  const validDuration = runs.filter((run) => Number(run.duration) > 0);

  const fastestDurationRun = minRunBy(validDuration, (run) => Number(run.duration));
  const fastestRun = minRunBy(validPace, (run) => Number(run.pace));
  const lowestHeartRate = minRunBy(validHeartRate, (run) => Number(run.heartRate));
  const highestCadence = maxRunBy(validCadence, (run) => Number(run.cadence));
  const mostElevation = maxRunBy(validElevation, (run) => Number(run.elevation));
  const longestRun = maxRunBy(runs, (run) => Number(run.distance || 0));
  const longestDuration = maxRunBy(runs, (run) => Number(run.duration || 0));
  const bestWeek = calculateBestTrainingWeek(runs);
  const improvement = calculateGreatestImprovement(chronological);
  const mostUsedShoe = calculateMostUsedShoe(runs);

  const primaryCards = [
    trainingHighlightCard("🏃", "Schnellste Pace", fastestRun ? `${formatPace(fastestRun.pace)} min/km` : "–", fastestRun, fastestRun ? formatDistance(fastestRun.distance) : "", "green"),
    trainingHighlightCard("📏", "Längster Lauf", longestRun ? formatDistance(longestRun.distance) : "–", longestRun, longestRun ? formatDuration(longestRun.duration) : "", "purple"),
    trainingHighlightCard("❤️", "Niedrigste HF", formatHeartRate(lowestHeartRate?.heartRate), lowestHeartRate, lowestHeartRate ? `${formatPace(lowestHeartRate.pace)} min/km` : "", "green"),
    trainingHighlightCard("👣", "Höchste Kadenz", formatCadence(highestCadence?.cadence), highestCadence, highestCadence ? formatDistance(highestCadence.distance) : "", "blue"),
    trainingHighlightCard("🔥", "Beste Trainingswoche", bestWeek ? formatDistance(bestWeek.distance) : "–", null, bestWeek ? `${bestWeek.label} · ${bestWeek.runs} Läufe` : "", "orange", bestWeek?.label),
    trainingHighlightCard("📈", "Größte Verbesserung", improvement ? formatPaceTrend(improvement.delta) : "–", improvement?.run, improvement ? `gegenüber ${formatDate(improvement.previous.date)}` : "Noch keine Verbesserung messbar", "green"),
  ];
  const additionalCards = [
    trainingHighlightCard("🏃", "Schnellster Lauf", fastestDurationRun ? formatDuration(fastestDurationRun.duration) : "–", fastestDurationRun, fastestDurationRun ? `${formatDistance(fastestDurationRun.distance)} · ${formatPace(fastestDurationRun.pace)} min/km` : "", "blue"),
    trainingHighlightCard("⛰️", "Meiste Höhenmeter", formatElevation(mostElevation?.elevation), mostElevation, mostElevation ? formatDistance(mostElevation.distance) : "", "orange"),
    trainingHighlightCard("⏱️", "Längste Zeit", longestDuration ? formatDuration(longestDuration.duration) : "–", longestDuration, longestDuration ? formatDistance(longestDuration.distance) : "", "purple"),
    trainingHighlightCard("👟", "Häufigster Schuh", mostUsedShoe ? `${mostUsedShoe.runs} Läufe` : "–", null, mostUsedShoe ? `${formatDistance(mostUsedShoe.distance)} insgesamt` : "Noch kein Schuh zugeordnet", "blue", mostUsedShoe?.name),
  ];
  if (highlightsToggle) {
    highlightsToggle.hidden = false;
    highlightsToggle.textContent = highlightsExpanded ? "Weniger Highlights anzeigen" : "Alle Highlights anzeigen";
    highlightsToggle.setAttribute("aria-expanded", String(highlightsExpanded));
  }
  return [...primaryCards, ...(highlightsExpanded ? additionalCards : [])].join("");
}

function runTimestamp(run) {
  return new Date(`${run.date}T${run.time || "00:00"}`).getTime();
}

function minRunBy(sourceRuns, selector) {
  return sourceRuns.reduce((best, run) => best === null || selector(run) < selector(best) ? run : best, null);
}

function maxRunBy(sourceRuns, selector) {
  return sourceRuns.reduce((best, run) => best === null || selector(run) > selector(best) ? run : best, null);
}

function calculateBestTrainingWeek(sourceRuns) {
  const weeks = new Map();
  sourceRuns.forEach((run) => {
    const date = new Date(`${run.date}T${run.time || "00:00"}`);
    const week = getIsoWeekNumber(date);
    const year = getIsoWeekYear(date);
    const key = `${year}-${week}`;
    if (!weeks.has(key)) weeks.set(key, { year, week, distance: 0, runs: 0 });
    const entry = weeks.get(key);
    entry.distance += Number(run.distance || 0);
    entry.runs += 1;
  });
  const best = [...weeks.values()].reduce((current, entry) => current === null || entry.distance > current.distance ? entry : current, null);
  return best ? { ...best, label: `KW ${String(best.week).padStart(2, "0")}, ${best.year}` } : null;
}

function getIsoWeekYear(date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  return utc.getUTCFullYear();
}

function calculateGreatestImprovement(chronologicalRuns) {
  let best = null;
  for (let index = 1; index < chronologicalRuns.length; index += 1) {
    const previous = chronologicalRuns[index - 1];
    const run = chronologicalRuns[index];
    const previousPace = Number(previous.pace);
    const currentPace = Number(run.pace);
    if (previousPace <= 0 || currentPace <= 0) continue;
    const delta = previousPace - currentPace;
    if (delta > 0 && (!best || delta > best.delta)) best = { delta, previous, run };
  }
  return best;
}

function calculateMostUsedShoe(sourceRuns) {
  const grouped = new Map();
  sourceRuns.forEach((run) => {
    const shoe = getShoeById(run.shoeId);
    if (!shoe) return;
    if (!grouped.has(shoe.id)) grouped.set(shoe.id, { name: shoe.name, runs: 0, distance: 0 });
    const entry = grouped.get(shoe.id);
    entry.runs += 1;
    entry.distance += Number(run.distance || 0);
  });
  return [...grouped.values()].reduce((best, entry) => {
    if (!best || entry.runs > best.runs || (entry.runs === best.runs && entry.distance > best.distance)) return entry;
    return best;
  }, null);
}

function trainingHighlightCard(icon, title, value, run, detail, tone, aggregateLabel = "") {
  const shoeName = run?.shoeId ? getShoeName(run.shoeId) : "";
  const dateLabel = run ? formatDate(run.date) : aggregateLabel;
  return `<article class="training-highlight highlight-${tone}" tabindex="0">
    <div class="training-highlight-icon" aria-hidden="true">${icon}</div>
    <div class="training-highlight-title">${escapeHtml(title)}</div>
    <strong class="training-highlight-value">${escapeHtml(value)}</strong>
    ${detail ? `<div class="training-highlight-detail">${escapeHtml(detail)}</div>` : ""}
    ${dateLabel ? `<time class="training-highlight-date">${escapeHtml(dateLabel)}</time>` : ""}
    ${shoeName ? `<div class="training-highlight-shoe">👟 ${escapeHtml(shoeName)}</div>` : ""}
  </article>`;
}

function renderOverview(runs) {
  const buckets = new Map();
  const sortedRuns = [...runs].sort((a, b) => new Date(`${a.date}T${a.time || "00:00"}`) - new Date(`${b.date}T${b.time || "00:00"}`));

  sortedRuns.forEach((run) => {
    const date = new Date(`${run.date}T${run.time || "00:00"}`);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;
    const key = `${monthKey} | ${weekKey}`;
    if (!buckets.has(key)) {
      buckets.set(key, { month: monthKey, week: weekKey, distance: 0, runs: 0, pace: 0 });
    }
    const entry = buckets.get(key);
    entry.distance += run.distance;
    entry.runs += 1;
    entry.pace += run.pace;
  });

  const entries = Array.from(buckets.values()).reverse();
  const visibleEntries = overviewExpanded ? entries : entries.slice(0, OVERVIEW_INITIAL_SIZE);
  if (overviewToggle) {
    overviewToggle.hidden = entries.length <= OVERVIEW_INITIAL_SIZE;
    overviewToggle.textContent = overviewExpanded ? `Nur letzte ${OVERVIEW_INITIAL_SIZE} Wochen anzeigen` : `${entries.length - OVERVIEW_INITIAL_SIZE} ältere Wochen anzeigen`;
    overviewToggle.setAttribute("aria-expanded", String(overviewExpanded));
  }
  return visibleEntries
    .map((entry) => {
      const avgPace = entry.pace / entry.runs;
      const label = `${entry.month} · ${entry.week}`;
      return `<div class="overview-item"><div><strong>${label}</strong><div>${entry.runs} Läufe</div></div><div>${formatDistance(entry.distance)} · ${formatPace(avgPace)} min/km</div></div>`;
    })
    .join("");
}

function getWeekNumber(date) {
  return getIsoWeekNumber(date);
}

function renderRuns() {
  const query = (historySearch?.value || "").trim().toLocaleLowerCase("de");
  const shoeFilter = historyShoeFilter?.value || "all";
  const sortOrder = historySort?.value || "newest";
  const filtered = filterAndSortRuns(runs, { query, shoeId: shoeFilter, sort: sortOrder, getShoeName });
  const pagination = paginateRuns(filtered, historyCurrentPage, historyPageSize);
  const totalPages = pagination.totalPages;
  historyCurrentPage = pagination.currentPage;
  const pageRuns = pagination.items;
  if (historyCount) historyCount.textContent = `${filtered.length} von ${runs.length} Läufen`;
  if (historyPage) historyPage.textContent = `Seite ${historyCurrentPage} von ${totalPages}`;
  if (historyPrev) historyPrev.disabled = historyCurrentPage <= 1;
  if (historyNext) historyNext.disabled = historyCurrentPage >= totalPages;

  if (!pageRuns.length) {
    runsList.innerHTML = '<div class="empty-state">Keine passenden Läufe gefunden.</div>';
    return;
  }

  runsList.innerHTML = pageRuns.map((run) => {
    const dateLabel = formatDate(run.date);
    const durationLabel = formatDuration(run.duration ?? 0);
    return `<article class="run-entry">
      <div class="run-summary">
        <div class="run-main"><strong>${dateLabel} · ${run.time || "--:--"}</strong><div class="run-meta">${formatDistance(run.distance)} · ${durationLabel} · ${formatPace(run.pace)} min/km · ${formatHeartRate(run.heartRate)}</div><div class="run-meta">${escapeHtml(getShoeName(run.shoeId))}${run.route ? ` · ${escapeHtml(run.route)}` : ""}</div></div>
        <div class="entry-actions"><button class="secondary-btn" data-action="toggle" data-id="${run.id}">Details</button><button class="secondary-btn" data-action="edit" data-id="${run.id}">Bearbeiten</button><button class="danger-btn" data-action="delete" data-id="${run.id}">Löschen</button></div>
      </div>
      <div class="run-details"><div class="run-meta">Ort: ${escapeHtml(run.location || "–")} · Untergrund: ${escapeHtml(run.terrain || "–")} · Wetter: ${escapeHtml(run.weather || "–")} ${run.temperature ? `· ${String(run.temperature).replace(".", ",")} °C` : ""}</div><div class="run-meta">Kadenz: ${formatCadence(run.cadence)} · Höhenmeter: ${formatElevation(run.elevation)} · Gefühl: ${run.feeling || "–"}/5</div><div class="run-meta">Notiz: ${escapeHtml(run.notes || "Keine Notiz")}</div></div>
    </article>`;
  }).join("");
}
runsList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;

  const id = button.getAttribute("data-id");
  const action = button.getAttribute("data-action");
  if (action === "toggle") {
    button.closest(".run-entry")?.classList.toggle("open");
    return;
  }
  if (action === "edit") {
    startEditingRun(id);
    return;
  }

  if (!window.confirm("Diesen Eintrag wirklich löschen?")) return;
  runs = runs.filter((run) => run.id !== id);
  if (editingRunId === id) resetEditMode();
  saveRuns();
  render();
});

function startEditingRun(id) {
  const run = runs.find((item) => item.id === id);
  if (!run) return;
  editingRunId = id;
  document.getElementById("date").value = run.date || "";
  document.getElementById("time").value = run.time || "";
  document.getElementById("distance").value = String(run.distance || "").replace(".", ",");
  document.getElementById("duration").value = formatDuration(run.duration || 0);
  document.getElementById("pace-input").value = run.pace ? formatPace(run.pace) : "";
  document.getElementById("heartRate").value = run.heartRate || "";
  document.getElementById("cadence").value = run.cadence || "";
  document.getElementById("elevation").value = run.elevation || "";
  document.getElementById("feeling").value = run.feeling || 3;
  document.getElementById("terrain").value = run.terrain || "";
  document.getElementById("location").value = run.location || "";
  document.getElementById("temperature").value = run.temperature || "";
  document.getElementById("weather").value = run.weather || "";
  document.getElementById("route").value = run.route || "";
  document.getElementById("notes").value = run.notes || "";
  buildShoeOptions();
  shoesSelect.value = getShoeById(run.shoeId) ? run.shoeId : "";
  saveRunBtn.textContent = "Änderungen speichern";
  cancelEditBtn.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetEditMode() {
  editingRunId = null;
  form.reset();
  saveRunBtn.textContent = "Lauf speichern";
  cancelEditBtn.hidden = true;
  setDefaultDateTime();
  buildShoeOptions();
}

function sortRuns() {
  runs.sort((a, b) => new Date(`${b.date}T${b.time || "00:00"}`) - new Date(`${a.date}T${a.time || "00:00"}`));
}

function addShoe() {
  const shoeName = addShoeInput.value.trim();
  if (!shoeName) return setShoeManagerStatus("Bitte einen Namen für den neuen Schuh eingeben.", true);

  const existingShoe = shoes.find((shoe) => shoe.name.localeCompare(shoeName, "de", { sensitivity: "base" }) === 0);
  if (existingShoe) {
    manageShoeSelect.value = existingShoe.id;
    shoesSelect.value = existingShoe.id;
    renameShoeInput.value = existingShoe.name;
    return setShoeManagerStatus(`„${existingShoe.name}“ ist bereits vorhanden.`, true);
  }

  const shoe = { id: crypto.randomUUID(), name: shoeName };
  shoes.push(shoe);
  saveShoes();
  addShoeInput.value = "";
  buildShoeOptions();
  shoesSelect.value = shoe.id;
  manageShoeSelect.value = shoe.id;
  renameShoeInput.value = shoe.name;
  buildShoeOptions();
  manageShoeSelect.value = shoe.id;
  shoesSelect.value = shoe.id;
  renameShoeInput.value = shoe.name;
  setShoeManagerStatus(`„${shoe.name}“ wurde hinzugefügt und alphabetisch einsortiert.`);
}

function renameShoe(shoeId, newNameRaw) {
  const newName = newNameRaw.trim();
  const shoe = getShoeById(shoeId);
  if (!shoe || !newName) return setShoeManagerStatus("Bitte Schuh und neuen Namen auswählen.", true);
  if (shoe.name.localeCompare(newName, "de", { sensitivity: "base" }) === 0 && shoe.name === newName) {
    return setShoeManagerStatus("Der neue Name ist identisch.", true);
  }
  const duplicate = shoes.find((item) => item.id !== shoeId && item.name.localeCompare(newName, "de", { sensitivity: "base" }) === 0);
  if (duplicate) return setShoeManagerStatus("Der Zielname existiert bereits. Nutze stattdessen Zusammenführen.", true);

  const oldName = shoe.name;
  shoe.name = newName;
  saveShoes();
  buildShoeOptions();
  manageShoeSelect.value = shoeId;
  shoesSelect.value = shoeId;
  renameShoeInput.value = newName;
  buildShoeOptions();
  manageShoeSelect.value = shoeId;
  shoesSelect.value = shoeId;
  renameShoeInput.value = newName;
  render();
  setShoeManagerStatus(`„${oldName}“ wurde in „${newName}“ umbenannt. Alle zugeordneten Läufe bleiben unverändert verknüpft.`);
}

function mergeShoes(sourceId, targetId) {
  const source = getShoeById(sourceId);
  const target = getShoeById(targetId);
  if (!source || !target) return setShoeManagerStatus("Bitte Quell- und Zielschuh auswählen.", true);
  if (sourceId === targetId) return setShoeManagerStatus("Quelle und Ziel dürfen nicht identisch sein.", true);
  const affected = runs.filter((run) => run.shoeId === sourceId).length;
  if (!window.confirm(`„${source.name}“ mit „${target.name}“ zusammenführen? ${affected} Laufeinträge werden angepasst.`)) return;

  if (!createAutomaticRecovery(`Vor Zusammenführen der Schuhe „${source.name}“ und „${target.name}“`)) return;
  runs = runs.map((run) => run.shoeId === sourceId ? { ...run, shoeId: targetId } : run);
  shoes = shoes.filter((shoe) => shoe.id !== sourceId);
  saveRuns();
  saveShoes();
  render();
  manageShoeSelect.value = targetId;
  shoesSelect.value = targetId;
  renameShoeInput.value = target.name;
  buildShoeOptions();
  manageShoeSelect.value = targetId;
  shoesSelect.value = targetId;
  renameShoeInput.value = target.name;
  setShoeManagerStatus(`„${source.name}“ wurde mit „${target.name}“ zusammengeführt. ${affected} Läufe wurden aktualisiert.`);
  renderRecoveryBackups();
}

function removeUnusedShoe(shoeId) {
  const shoe = getShoeById(shoeId);
  if (!shoe) return setShoeManagerStatus("Bitte zuerst einen Schuh auswählen.", true);
  const usageCount = runs.filter((run) => run.shoeId === shoeId).length;
  if (usageCount > 0) return setShoeManagerStatus(`Der Schuh wird noch in ${usageCount} Lauf${usageCount === 1 ? "" : "en"} verwendet. Bitte zuerst zusammenführen oder die betreffenden Läufe bearbeiten.`, true);
  if (!window.confirm(`Den unbenutzten Schuh „${shoe.name}“ löschen?`)) return;
  shoes = shoes.filter((item) => item.id !== shoeId);
  saveShoes();
  render();
  setShoeManagerStatus(`„${shoe.name}“ wurde gelöscht.`);
}

function setShoeManagerStatus(message, isError = false) {
  shoeManagerStatus.textContent = message;
  shoeManagerStatus.classList.toggle("error", isError);
}

function formatRunDate(run) {
  return formatDate(run?.date);
}

async function resolveCoordinates(locationText) {
  if (locationText) {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationText)}&count=1&language=de&format=json`);
    const data = await response.json();
    if (data.results?.[0]) {
      return { latitude: data.results[0].latitude, longitude: data.results[0].longitude };
    }
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error("Standort konnte nicht ermittelt werden.")),
      { timeout: 8000 }
    );
  });
}

async function fetchWeather(coords, dateText, timeText) {
  const targetDate = new Date(`${dateText}T${timeText || "12:00"}`);
  const isHistorical = targetDate < new Date(new Date().setHours(0, 0, 0, 0));
  const baseUrl = isHistorical ? "https://archive-api.open-meteo.com/v1/archive" : "https://api.open-meteo.com/v1/forecast";
  const url = `${baseUrl}?latitude=${coords.latitude}&longitude=${coords.longitude}&start_date=${dateText}&end_date=${dateText}&hourly=temperature_2m,weather_code&timezone=auto`;
  const response = await fetch(url);
  const data = await response.json();

  const hourlyTimes = data.hourly?.time || [];
  const temperatures = data.hourly?.temperature_2m || [];
  const codes = data.hourly?.weather_code || [];
  const hour = Number((timeText || "12:00").split(":")[0]);
  const index = Math.max(0, Math.min(hourlyTimes.length - 1, hour));

  return {
    temperature: temperatures[index]?.toFixed(1) ?? "",
    label: mapWeatherCode(codes[index]),
  };
}

function mapWeatherCode(code) {
  switch (code) {
    case 0:
      return "Klar";
    case 1:
    case 2:
    case 3:
      return "Bewölkt";
    case 45:
    case 48:
      return "Nebel";
    case 51:
    case 53:
    case 55:
      return "Nieselregen";
    case 61:
    case 63:
    case 65:
      return "Regen";
    case 71:
    case 73:
    case 75:
      return "Schnee";
    case 95:
    case 96:
    case 99:
      return "Gewitter";
    default:
      return "Unbekannt";
  }
}

function parseDistance(value) {
  const normalized = String(value || "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePaceInput(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return 0;
  if (normalized.includes(":")) {
    const seconds = parseDuration(normalized);
    return seconds > 0 ? seconds / 60 : 0;
  }
  return parseDistance(normalized);
}

function parseDuration(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return 0;
  if (normalized.includes(":")) {
    const parts = normalized.split(":").map(Number);
    if (parts.some((part) => !Number.isFinite(part) || part < 0)) return 0;
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return minutes < 60 && seconds < 60 ? hours * 3600 + minutes * 60 + seconds : 0;
    }
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return seconds < 60 ? minutes * 60 + seconds : 0;
    }
    return 0;
  }
  return Number(normalized) * 60;
}

function setDefaultDateTime() {
  const now = new Date();
  document.getElementById("date").value = localDateValue(now);
  document.getElementById("time").value = now.toTimeString().slice(0, 5);
}


function loadMetadata() {
  return storageLoadMetadata();
}
function touchMetadata() {
  storageTouchMetadata(APP_VERSION, DB_VERSION);
}
function updateDatabaseStatus() {
  const meta = loadMetadata();
  if (dbRuns) dbRuns.textContent = String(runs.length);
  if (dbShoes) dbShoes.textContent = String(shoes.length);
  if (dbUpdated) dbUpdated.textContent = meta.updatedAt ? new Date(meta.updatedAt).toLocaleString("de-DE") : "–";
  if (dbBackup) dbBackup.textContent = meta.lastBackupAt ? new Date(meta.lastBackupAt).toLocaleString("de-DE") : "–";
  if (dbMigration) {
    const completed = localStorage.getItem(SHOE_MIGRATION_KEY) === "1";
    dbMigration.textContent = completed
      ? `${migrationStatusLabel(meta.migrationStatus)}${meta.migrationCompletedAt ? ` · ${new Date(meta.migrationCompletedAt).toLocaleString("de-DE")}` : ""}`
      : "Nicht abgeschlossen";
    dbMigration.classList.toggle("status-error", !completed);
  }
  if (dbHealth) {
    const health = getStorageHealth();
    const damaged = Object.values(health).some((entry) => entry?.ok === false);
    dbHealth.textContent = damaged ? "Prüfung erforderlich – Schreiben blockiert" : "Integrität geprüft";
    dbHealth.classList.toggle("status-error", damaged);
  }
  if (historyShoeFilter) {
    const current = historyShoeFilter.dataset.initialized ? historyShoeFilter.value : settings.historyShoeFilter;
    historyShoeFilter.innerHTML = '<option value="all">Alle Schuhe</option><option value="">Ohne Zuordnung</option>' + [...shoes].sort((a,b)=>a.name.localeCompare(b.name,"de")).map(shoe=>`<option value="${escapeHtml(shoe.id)}">${escapeHtml(shoe.name)}</option>`).join("");
    historyShoeFilter.value = [...historyShoeFilter.options].some(o=>o.value===current) ? current : "all";
    historyShoeFilter.dataset.initialized = "true";
  }
}
function createBackupObject() {
  return buildBackupObject(runs, shoes, APP_VERSION, DB_VERSION, settings);
}
function downloadJson(data, filename) {
  downloadBackupJson(data, filename);
}
function exportBackup(isAutomatic=false) {
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  downloadJson(createBackupObject(), `running-dashboard-backup-${stamp}.json`);
  storageUpdateBackupMetadata(APP_VERSION, DB_VERSION);
  if (backupStatus) backupStatus.textContent = isAutomatic ? "Sicherheitsbackup wurde erstellt." : "JSON-Sicherung wurde heruntergeladen.";
  updateDatabaseStatus();
}
async function importBackup(file) {
  const text=await file.text(); const data=JSON.parse(text);
  const validation = validateBackup(data, DB_VERSION);
  if (!validation.ok) throw new Error(validation.errors.slice(0, 5).join("\n"));
  const settingsKeys = Object.keys(data.settings || {});
  const warnings = validation.warnings.length
    ? `<div class="dialog-warning"><strong>Hinweise</strong><ul>${validation.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></div>`
    : "";
  const confirmed = await showBackupDialog(
    "JSON-Import prüfen",
    `<dl class="preview-list">
      <div><dt>Backup-Version</dt><dd>${escapeHtml(data.appVersion || "Unbekannt")}</dd></div>
      <div><dt>Datenbankversion</dt><dd>${escapeHtml(data.dbVersion ?? "Unbekannt")}</dd></div>
      <div><dt>Läufe</dt><dd>${data.runs.length} (aktuell ${runs.length})</dd></div>
      <div><dt>Schuhe</dt><dd>${data.shoes.length} (aktuell ${shoes.length})</dd></div>
      <div><dt>Einstellungen</dt><dd>${settingsKeys.length ? settingsKeys.map(escapeHtml).join(", ") : "Keine – Standardwerte werden ergänzt"}</dd></div>
    </dl>${warnings}<p><strong>Beim Import werden die aktuellen Läufe, Schuhe und Einstellungen ersetzt.</strong></p>`,
    "Importieren und ersetzen",
    true,
  );
  if (!confirmed) return;
  if (!createAutomaticRecovery("Vor JSON-Import")) throw new Error("Der Import wurde abgebrochen, weil das Recovery-Backup nicht gespeichert werden konnte.");
  const nextRuns=structuredClone(data.runs); const nextShoes=structuredClone(data.shoes);
  nextRuns.sort((a,b)=>new Date(`${b.date}T${b.time||"00:00"}`)-new Date(`${a.date}T${a.time||"00:00"}`));
  const nextSettings = validation.settings;
  replaceDatabaseSafely(nextRuns, nextShoes, data.metadata, APP_VERSION, DB_VERSION, nextSettings);
  runs=nextRuns; shoes=nextShoes; settings=nextSettings; historyPageSize=settings.historyPageSize; historyCurrentPage=1;
  applySettingsToUi();
  applyTheme(settings.theme, false);
  render();
  renderRecoveryBackups();
  if (backupStatus) backupStatus.textContent="Backup erfolgreich importiert.";
}

function migrationStatusLabel(status) {
  if (status === "migrated") return "Erfolgreich migriert";
  if (status === "checked-no-data") return "Geprüft – keine Altdaten";
  if (status === "already-complete") return "Bereits abgeschlossen";
  return "Abgeschlossen";
}

function createAutomaticRecovery(reason) {
  try {
    createRecoverySnapshot(reason, APP_VERSION, DB_VERSION, runs, shoes, settings);
    renderRecoveryBackups();
    return true;
  } catch (error) {
    console.error(`Recovery-Backup fehlgeschlagen (${reason}). Die geplante Datenänderung wurde abgebrochen.`, error);
    if (backupStatus) {
      backupStatus.textContent = `Aktion abgebrochen: Recovery-Backup konnte nicht erstellt werden. ${error.message}`;
      backupStatus.classList.add("error");
    }
    return false;
  }
}

function showBackupDialog(title, content, confirmLabel = "", danger = false) {
  if (!backupDialog?.showModal) return Promise.resolve(window.confirm(`${title}\n\n${content.replace(/<[^>]+>/g, " ")}`));
  document.getElementById("backup-dialog-title").textContent = title;
  backupDialogContent.innerHTML = content;
  backupDialogActions.innerHTML = "";
  return new Promise((resolve) => {
    const close = (result) => {
      backupDialog.close();
      resolve(result);
    };
    const headingClose = document.getElementById("backup-dialog-close");
    headingClose.onclick = () => close(false);
    backupDialog.oncancel = (event) => {
      event.preventDefault();
      close(false);
    };
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "secondary-btn";
    cancel.textContent = confirmLabel ? "Abbrechen" : "Schließen";
    cancel.addEventListener("click", () => close(false), { once: true });
    backupDialogActions.appendChild(cancel);
    if (confirmLabel) {
      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = danger ? "danger-btn" : "";
      confirm.textContent = confirmLabel;
      confirm.addEventListener("click", () => close(true), { once: true });
      backupDialogActions.appendChild(confirm);
    }
    backupDialog.showModal();
  });
}

function recoveryAsJson(backup) {
  return {
    format: "running-dashboard-backup",
    schemaVersion: 2,
    appVersion: backup.appVersion,
    dbVersion: backup.dbVersion,
    exportedAt: backup.createdAt,
    recoveryId: backup.id,
    recoveryReason: backup.reason,
    runs: structuredClone(backup.runs),
    shoes: structuredClone(backup.shoes),
    settings: structuredClone(normalizeSettings(backup.settings)),
    metadata: structuredClone(backup.metadata || {}),
  };
}

function recoveryPreview(backup) {
  return `<dl class="preview-list">
    <div><dt>Zeitpunkt</dt><dd>${new Date(backup.createdAt).toLocaleString("de-DE")}</dd></div>
    <div><dt>Grund</dt><dd>${escapeHtml(backup.reason)}</dd></div>
    <div><dt>Läufe</dt><dd>${backup.runs.length}</dd></div>
    <div><dt>Schuhe</dt><dd>${backup.shoes.length}</dd></div>
    <div><dt>App-Version</dt><dd>${escapeHtml(backup.appVersion)}</dd></div>
    <div><dt>Datenbankversion</dt><dd>${escapeHtml(backup.dbVersion)}</dd></div>
    <div><dt>Farbschema</dt><dd>${escapeHtml(normalizeSettings(backup.settings).theme)}</dd></div>
  </dl>`;
}

function renderRecoveryBackups() {
  if (!recoveryList) return;
  const backups = loadRecoveryBackups();
  const recoveryHealth = getRecoveryHealth();
  if (!recoveryHealth.ok) {
    if (recoveryCount) recoveryCount.textContent = "Fehler";
    recoveryList.innerHTML = `<div class="dialog-warning"><strong>Recovery-Speicher beschädigt</strong><p>${escapeHtml(recoveryHealth.error)} Der vorhandene Wert wurde nicht verändert.</p></div>`;
    return;
  }
  if (recoveryCount) recoveryCount.textContent = `${backups.length} / 5`;
  if (!backups.length) {
    recoveryList.innerHTML = '<div class="empty-state">Noch keine automatischen Recovery-Backups vorhanden.</div>';
    return;
  }
  recoveryList.innerHTML = backups.map((backup) => `
    <article class="recovery-item" data-recovery-id="${escapeHtml(backup.id)}">
      <div><strong>${escapeHtml(backup.reason)}</strong><div class="run-meta">${new Date(backup.createdAt).toLocaleString("de-DE")} · ${backup.runs.length} Läufe · ${backup.shoes.length} Schuhe</div><div class="run-meta">App ${escapeHtml(backup.appVersion)} · DB ${escapeHtml(backup.dbVersion)}</div></div>
      <div class="recovery-actions"><button type="button" class="secondary-btn" data-recovery-action="preview">Vorschau</button><button type="button" data-recovery-action="restore">Wiederherstellen</button><button type="button" class="secondary-btn" data-recovery-action="download">JSON</button><button type="button" class="danger-btn" data-recovery-action="delete">Löschen</button></div>
    </article>`).join("");
}

async function restoreRecoveryBackup(backup) {
  const confirmed = await showBackupDialog(
    "Recovery-Backup wiederherstellen",
    `${recoveryPreview(backup)}<p><strong>Ersetzt werden aktuell ${runs.length} Läufe, ${shoes.length} Schuhe und die gespeicherten Einstellungen.</strong></p><p>Vorher wird der jetzige Zustand als neues Recovery-Backup gesichert.</p>`,
    "Ausdrücklich wiederherstellen",
    true,
  );
  if (!confirmed) return;
  if (!createAutomaticRecovery("Vor vollständiger Wiederherstellung")) return;
  const nextRuns = structuredClone(backup.runs);
  const nextShoes = structuredClone(backup.shoes);
  const nextSettings = normalizeSettings(backup.settings);
  replaceDatabaseSafely(nextRuns, nextShoes, backup.metadata, APP_VERSION, DB_VERSION, nextSettings);
  runs = nextRuns;
  shoes = nextShoes;
  settings = nextSettings;
  historyPageSize = settings.historyPageSize;
  historyCurrentPage = 1;
  applySettingsToUi();
  applyTheme(settings.theme, false);
  render();
  renderRecoveryBackups();
  backupStatus.textContent = "Recovery-Backup wurde erfolgreich wiederhergestellt.";
}

recoveryList?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-recovery-action]");
  if (!button) return;
  const item = button.closest("[data-recovery-id]");
  const backup = loadRecoveryBackups().find((entry) => entry.id === item?.dataset.recoveryId);
  if (!backup) return;
  const action = button.dataset.recoveryAction;
  if (action === "preview") await showBackupDialog("Recovery-Vorschau", recoveryPreview(backup));
  if (action === "download") downloadJson(recoveryAsJson(backup), `running-dashboard-recovery-${backup.createdAt.replace(/[:.]/g, "-")}.json`);
  if (action === "restore") await restoreRecoveryBackup(backup);
  if (action === "delete" && window.confirm(`Recovery-Backup vom ${new Date(backup.createdAt).toLocaleString("de-DE")} wirklich löschen?`)) {
    deleteRecoveryBackup(backup.id);
    renderRecoveryBackups();
  }
});

function persistSettings(patch) {
  settings = saveSettings({ ...settings, ...patch });
  historyPageSize = settings.historyPageSize;
}

function applySettingsToUi() {
  if (themeSetting) themeSetting.value = settings.theme;
  if (historyPageSizeSetting) historyPageSizeSetting.value = String(settings.historyPageSize);
  if (historySort) historySort.value = settings.historySort;
  if (benchmarkFilter) benchmarkFilter.value = settings.benchmarkFilter;
  if (monthFilter) delete monthFilter.dataset.initialized;
  if (routeFilter) delete routeFilter.dataset.initialized;
  if (historyShoeFilter) delete historyShoeFilter.dataset.initialized;
}

jsonExportBtn?.addEventListener("click",()=>exportBackup(false));
jsonImportInput?.addEventListener("change",async(event)=>{const file=event.target.files?.[0]; if(!file)return; try{await importBackup(file);}catch(error){window.alert(`Import fehlgeschlagen: ${error.message}`);} finally{event.target.value="";}});
historySearch?.addEventListener("input",()=>{historyCurrentPage=1;renderRuns();});
historyShoeFilter?.addEventListener("change",()=>{historyCurrentPage=1;persistSettings({historyShoeFilter:historyShoeFilter.value});renderRuns();});
historySort?.addEventListener("change",()=>{historyCurrentPage=1;persistSettings({historySort:historySort.value});renderRuns();});
themeSetting?.addEventListener("change",()=>applyTheme(themeSetting.value, true));
historyPageSizeSetting?.addEventListener("change",()=>{persistSettings({historyPageSize:Number(historyPageSizeSetting.value)});historyCurrentPage=1;renderRuns();});
historyPrev?.addEventListener("click",()=>{if(historyCurrentPage>1){historyCurrentPage--;renderRuns();}});
historyNext?.addEventListener("click",()=>{historyCurrentPage++;renderRuns();});
overviewToggle?.addEventListener("click", () => {
  overviewExpanded = !overviewExpanded;
  overviewList.innerHTML = renderOverview(filterRuns(runs));
});
highlightsToggle?.addEventListener("click", () => {
  highlightsExpanded = !highlightsExpanded;
  highlightsList.innerHTML = renderHighlights(filterRuns(runs));
});
function activateTab(btn) {
  document.querySelectorAll(".tab-btn").forEach((item) => {
    item.classList.toggle("active", item === btn);
    item.setAttribute("aria-selected", String(item === btn));
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
  document.getElementById(btn.dataset.tab)?.classList.add("active");
}
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => activateTab(btn));
  btn.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...document.querySelectorAll(".tab-btn")];
    const current = tabs.indexOf(btn);
    const target = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : tabs[(current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    target.focus();
    activateTab(target);
  });
});
function applyTheme(theme, persist = true) {
  const preference = ["light", "dark", "system"].includes(theme) ? theme : "system";
  const resolved = preference === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
  document.documentElement.dataset.theme = resolved;
  if (persist) persistSettings({ theme: preference });
  if (themeSetting) themeSetting.value = preference;
  if (themeToggle) themeToggle.textContent = resolved === "dark" ? "☀ Hell" : "☾ Dunkel";
}
applySettingsToUi();
applyTheme(settings.theme, false);
themeToggle?.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true));
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (settings.theme === "system") applyTheme("system", false);
});
const originalRender = render;
render = function(){ originalRender(); updateDatabaseStatus(); };
const initialHealth = getStorageHealth();
if (initialHealth.metadata?.ok !== false && !(loadMetadata().dbVersion)) touchMetadata();
if ("serviceWorker" in navigator && ["http:", "https:"].includes(location.protocol)) {
  navigator.serviceWorker.register("./service-worker.js", { scope: "./" })
    .catch((error) => console.warn("Service Worker konnte nicht registriert werden; die Anwendung bleibt online nutzbar.", error));
}

render();
renderRecoveryBackups();
setDefaultDateTime();
