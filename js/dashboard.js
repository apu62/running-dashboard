import { getIsoWeekNumber } from "./statistics.js?v=3.2.4";

export function getPeriodSummary(runs, now = new Date()) {
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentWeek = `${now.getFullYear()}-${getIsoWeekNumber(now)}`;
  const monthRuns = [];
  const weekRuns = [];
  runs.forEach((run) => {
    const date = new Date(`${run.date}T${run.time || "00:00"}`);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const weekKey = `${date.getFullYear()}-${getIsoWeekNumber(date)}`;
    if (monthKey === currentMonth) monthRuns.push(run);
    if (weekKey === currentWeek) weekRuns.push(run);
  });
  const distance = (items) => items.reduce((sum, run) => sum + Number(run.distance || 0), 0);
  return { weekRuns, monthRuns, weekDistance: distance(weekRuns), monthDistance: distance(monthRuns) };
}
