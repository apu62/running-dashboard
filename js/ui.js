export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatPace(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return "–";
  const totalSeconds = Math.round(Number(value) * 60);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function formatDistance(value, withUnit = true) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "–";
  const formatted = number.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return withUnit ? `${formatted} km` : formatted;
}

export function formatNumber(value, fractionDigits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "–";
  return number.toLocaleString("de-DE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatDate(value) {
  if (!value) return "–";
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatHeartRate(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `${Math.round(number)} bpm` : "–";
}

export function formatCadence(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `${Math.round(number)} spm` : "–";
}

export function formatElevation(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? `${Math.round(number)} m` : "–";
}

export function formatPaceTrend(delta) {
  const number = Number(delta);
  if (!Number.isFinite(number) || number === 0) return "Keine Veränderung";
  return `${formatPace(Math.abs(number))} min/km ${number > 0 ? "schneller" : "langsamer"}`;
}

export function parseDistance(value) {
  const parsed = Number(String(value || "").replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseDuration(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return 0;
  if (/^\d+:\d{1,2}$/.test(normalized)) {
    const [minutes, seconds] = normalized.split(":").map(Number);
    if (seconds >= 60) return 0;
    return minutes * 60 + seconds;
  }
  const minutes = Number(normalized.replace(",", "."));
  return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : 0;
}

export function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
