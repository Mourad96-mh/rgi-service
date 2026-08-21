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
    <section className={`py-14 ${className}`}>
      <div className="wrap">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 className="text-[30px] font-bold">{title}</h2>
            {text ? <p className="mt-1.5 text-[14.5px] text-muted">{text}</p> : null}
          </div>
          {href && linkLabel ? (
            <Link href={href} className="text-sm font-semibold text-accent2 transition hover:brightness-125">
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
    <div className="surface-card grid place-items-center gap-4 p-12 text-center">
      <p className="text-muted">{title}</p>
      {action}
    </div>
  );
}
