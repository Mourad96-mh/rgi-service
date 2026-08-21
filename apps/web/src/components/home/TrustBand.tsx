import { t } from '@/locales/fr';

const ITEMS = [
  { ico: '🔧', title: t.trust.assemblyTitle, text: t.trust.assemblyText },
  { ico: '🛡️', title: t.trust.warrantyTitle, text: t.trust.warrantyText },
  { ico: '💳', title: t.trust.paymentTitle, text: t.trust.paymentText },
  { ico: '🚚', title: t.trust.deliveryTitle, text: t.trust.deliveryText },
];

/** The four reassurance cards (DESIGN_SYSTEM.md §5 "Trust band"). */
export function TrustBand() {
  return (
    <section className="py-14">
      <div className="wrap grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item) => (
          <div key={item.title} className="surface-card flex items-start gap-3.5 p-[22px]">
            <span aria-hidden className="text-2xl">
              {item.ico}
            </span>
            <div>
              <h3 className="mb-1 text-[14.5px] font-semibold">{item.title}</h3>
              <p className="text-[12.5px] text-faint">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
