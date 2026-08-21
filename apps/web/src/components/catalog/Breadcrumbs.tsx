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
      <nav aria-label="Fil d'Ariane" className="mb-6 flex flex-wrap items-center gap-2 text-[13px] text-faint">
        {items.map((item, index) => (
          <span key={item.href} className="flex items-center gap-2">
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
