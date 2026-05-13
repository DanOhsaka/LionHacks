/** Shown immediately on client navigations while the next segment’s RSC payload loads. */
export default function DashboardLoading() {
  return (
    <div className="app-container-wide space-y-8" aria-busy aria-label="Loading">
      <div className="app-panel app-panel-elevated pp-skeleton-pulse h-28 rounded-2xl" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="app-panel pp-skeleton-pulse h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
