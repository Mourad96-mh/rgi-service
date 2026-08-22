import Link from 'next/link';
import type { ReactNode } from 'react';

/** Section shell: title, subtitle, optional "see all" link (DESIGN_SYSTEM.md §5). */
export function Section({
  title,
  text,
  href,
  linkLabel,
  children,
  className = '',
}: {
  title: string;
  text?: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    // Section rhythm scales with the screen: 56 px of air above and below a section reads
    // as generous on a desktop and as dead space on a 320 px phone.
    <section className={`py-10 sm:py-12 lg:py-14 ${className}`}>
      <div className="wrap">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-5 gap-y-3 sm:mb-7">
          <div className="min-w-0">
            <h2 className="t-h2 font-bold">{title}</h2>
            {text ? <p className="mt-1.5 text-sm text-muted sm:text-[14.5px]">{text}</p> : null}
          </div>
          {href && linkLabel ? (
            <Link
              href={href}
              className="shrink-0 text-sm font-semibold text-accent2 transition hover:brightness-125"
            >
              {linkLabel} →
            </Link>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Shown instead of a grid when the API is unreachable — never a blank page. */
export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="surface-card grid place-items-center gap-4 p-8 text-center sm:p-12">
      <p className="text-muted">{title}</p>
      {action}
    </div>
  );
}
