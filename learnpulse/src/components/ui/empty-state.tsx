import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="app-panel app-panel-elevated flex flex-col items-center rounded-2xl px-6 py-14 text-center">
      {Icon ? (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700/80 bg-zinc-950/60 text-emerald-400 shadow-inner shadow-black/20">
          <Icon className="h-7 w-7" strokeWidth={1.75} />
        </span>
      ) : null}
      <h2 className="font-display mt-5 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-app-muted">{description}</p>
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
