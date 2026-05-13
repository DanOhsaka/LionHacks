import Link from "next/link";
import { Fragment, type ReactNode } from "react";

export type PageHeaderCrumb = { label: string; href?: string };

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  titleGradient = false,
}: {
  title: string;
  description?: string;
  breadcrumbs?: PageHeaderCrumb[];
  action?: ReactNode;
  /** PridePath signature gradient (marketing / hero moments) */
  titleGradient?: boolean;
}) {
  return (
    <header className="app-panel app-panel-elevated flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-app-muted">
            {breadcrumbs.map((c, i) => (
              <Fragment key={`${c.label}-${i}`}>
                {i > 0 ? (
                  <span className="select-none text-zinc-600" aria-hidden>
                    /
                  </span>
                ) : null}
                {c.href ? (
                  <Link
                    href={c.href}
                    className="rounded-sm text-app-muted transition-colors hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="font-medium text-zinc-500">{c.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
        )}
        <div>
          <h1
            className={
              titleGradient
                ? "font-display bg-gradient-to-r from-emerald-300 via-amber-200 to-cyan-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl"
                : "font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            }
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-app-muted sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}
