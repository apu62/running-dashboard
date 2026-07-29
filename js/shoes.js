export function groupRunsByShoe(runs, getShoeName) {
  const grouped = new Map();
  runs.forEach((run) => {
    const name = getShoeName(run.shoeId);
    if (!grouped.has(name)) grouped.set(name, { name, runs: 0, distance: 0, paces: [], heartRates: [], cadences: [] });
    const item = grouped.get(name);
    item.runs += 1;
    item.distance += Number(run.distance || 0);
    if (Number(run.pace) > 0) item.paces.push(Number(run.pace));
    if (Number(run.heartRate) > 0) item.heartRates.push(Number(run.heartRate));
    if (Number(run.cadence) > 0) item.cadences.push(Number(run.cadence));
  });
  return [...grouped.values()];
}
