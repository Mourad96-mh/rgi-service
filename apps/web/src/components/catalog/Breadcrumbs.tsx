import Link from 'next/link';
import { SITE_URL } from '@/lib/env';

export interface Crumb {
  label: string;
  href: string;
}

/**
 * Breadcrumbs + their `BreadcrumbList` JSON-LD in one place, so the visible trail and the
 * structured data can never drift apart (SEO_STRATEGY.md §1).
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${SITE_URL}${item.href}`,
    })),
  };

  return (
    <>
      {/*
        A product trail ends with the full product name, which on a phone is longer than
        the screen. Below `sm` the trail scrolls sideways inside its own box (`.scroll-x`)
        instead of wrapping to four ragged lines or widening the page; from `sm` up there
        is room to wrap normally.
      */}
      <nav
        aria-label="Fil d'Ariane"
        className="scroll-x mb-5 flex items-center gap-2 whitespace-nowrap text-[13px] text-faint
          sm:mb-6 sm:flex-wrap sm:whitespace-normal"
      >
        {items.map((item, index) => (
          <span key={item.href} className="flex shrink-0 items-center gap-2 sm:shrink">
            {index > 0 ? <span aria-hidden>/</span> : null}
            {index === items.length - 1 ? (
              <span className="text-muted">{item.label}</span>
            ) : (
              <Link href={item.href} className="transition hover:text-text">
                {item.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
    </>
  );
}
