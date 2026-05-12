export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-8 top-8 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-8 right-8 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/45 shadow-2xl shadow-black/30 backdrop-blur-md md:grid-cols-2">
        <aside className="hidden border-r border-zinc-800/80 bg-zinc-900/60 p-8 md:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            PridePath
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white">
            Professional learning, game-level engagement.
          </h1>
          <p className="mt-4 text-sm text-zinc-400">
            Upload course material, track confidence by module, and improve with analytics-backed sessions.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-zinc-300">
            <li className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2">
              Structured assessments and mode-based practice.
            </li>
            <li className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2">
              Session recap with misconceptions and study plans.
            </li>
            <li className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2">
              Confidence tracking per module and trend analytics.
            </li>
          </ul>
        </aside>
        <div className="p-6 sm:p-8 md:p-10">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
