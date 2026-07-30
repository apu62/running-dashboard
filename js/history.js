export function filterAndSortRuns(runs, { query = "", shoeId = "all", sort = "newest", getShoeName, getTrainingTypeName = () => "" }) {
  const normalized = query.trim().toLocaleLowerCase("de");
  return runs.filter((run) => {
    if (shoeId !== "all" && (run.shoeId || "") !== shoeId) return false;
    if (!normalized) return true;
    return [run.date, run.location, run.route, run.terrain, run.weather, run.notes, getShoeName(run.shoeId), getTrainingTypeName(run.trainingType)]
      .filter(Boolean).join(" ").toLocaleLowerCase("de").includes(normalized);
  }).sort((a, b) => {
    const delta = new Date(`${b.date}T${b.time || "00:00"}`) - new Date(`${a.date}T${a.time || "00:00"}`);
    return sort === "oldest" ? -delta : delta;
  });
}

export function paginateRuns(runs, page, pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(runs.length / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  return {
    currentPage,
    totalPages,
    items: runs.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  };
}
