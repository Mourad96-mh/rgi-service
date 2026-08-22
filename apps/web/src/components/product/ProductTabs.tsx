'use client';

import { useId, useState } from 'react';
import { t } from '@/locales/fr';

export interface TabPanel {
  id: string;
  label: string;
  content: React.ReactNode;
}

/**
 * Description / specs / delivery, as real ARIA tabs. Every panel stays in the DOM (the
 * inactive ones carry `hidden`), so the full product copy is in the server-rendered HTML
 * for crawlers even though only one panel is visible.
 */
export function ProductTabs({ panels }: { panels: TabPanel[] }) {
  const [active, setActive] = useState(panels[0]?.id);
  const base = useId();

  return (
    <div className="mt-10 sm:mt-14">
      <div
        role="tablist"
        aria-label={t.product.description}
        className="scroll-x flex gap-2 border-b border-line"
      >
        {panels.map((panel) => {
          const selected = panel.id === active;
          return (
            <button
              key={panel.id}
              type="button"
              role="tab"
              id={`${base}-tab-${panel.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${panel.id}`}
              onClick={() => setActive(panel.id)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-semibold transition sm:px-4 ${
                selected
                  ? 'border-accent2 text-text'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {panel.label}
            </button>
          );
        })}
      </div>

      {panels.map((panel) => (
        <div
          key={panel.id}
          role="tabpanel"
          id={`${base}-panel-${panel.id}`}
          aria-labelledby={`${base}-tab-${panel.id}`}
          hidden={panel.id !== active}
          className="pt-6 sm:pt-7"
        >
          {panel.content}
        </div>
      ))}
    </div>
  );
}
