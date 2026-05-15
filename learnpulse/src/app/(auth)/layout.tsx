export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground"
      style={{ backgroundColor: "#070b14", color: "#e8eaef", minHeight: "100vh" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-8 top-8 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-8 right-8 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-highlight/5 blur-3xl" />
      </div>

      <div className="relative z-10 grid w-full min-w-0 max-w-4xl overflow-hidden rounded-2xl border border-zinc-800/80 bg-surface/90 shadow-2xl shadow-black/40 backdrop-blur-md md:grid-cols-2">
        <aside className="hidden border-r border-zinc-800/80 bg-surface-elevated/95 p-8 md:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-info">
            PridePath
          </p>
          <h1 className="font-display mt-4 text-3xl font-semibold leading-tight tracking-tight text-white">
            Professional learning, game-level engagement.
          </h1>
          <p className="app-prose mt-4 text-sm">
            Upload course material, track confidence by module, and improve with analytics-backed
            sessions.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-zinc-300">
            <li className="rounded-xl border border-zinc-800/80 bg-background/40 px-3 py-2">
              Structured assessments and mode-based practice.
            </li>
            <li className="rounded-xl border border-zinc-800/80 bg-background/40 px-3 py-2">
              Session recap with misconceptions and study plans.
            </li>
            <li className="rounded-xl border border-zinc-800/80 bg-background/40 px-3 py-2">
              Confidence tracking per module and trend analytics.
            </li>
          </ul>
        </aside>
        <div className="bg-surface/80 p-6 sm:p-8 md:p-10">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
