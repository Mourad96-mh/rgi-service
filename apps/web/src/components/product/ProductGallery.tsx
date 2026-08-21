'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ProductImage } from '@rgi/types';
import { t } from '@/locales/fr';
import { ArrowIcon } from '@/components/ui/Icons';

/**
 * Main shot + thumbnails + a fullscreen view. Every photo is a white pack shot, so the
 * frame is the light `photo-tile` used across the site rather than the dark surface.
 *
 * The whole gallery is client-side, but the page around it stays server-rendered: the
 * image URLs arrive as props, so the crawler still sees the primary `<img>` in the HTML.
 */
export function ProductGallery({
  images,
  name,
  badge,
}: {
  images: ProductImage[];
  name: string;
  badge?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const count = images.length;

  const go = (next: number) => setActive(((next % count) + count) % count);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomed(false);
      if (event.key === 'ArrowLeft') go(active - 1);
      if (event.key === 'ArrowRight') go(active + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!count) {
    return (
      <div className="photo-tile grid aspect-square place-items-center">
        <span aria-hidden className="text-[120px] opacity-20 grayscale">
          🖥️
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="photo-tile relative aspect-square">
        <Image
          src={images[active].url}
          alt={images[active].alt ?? name}
          fill
          sizes="(max-width:1024px) 100vw, 46vw"
          className="object-contain p-8"
          priority
        />
        {badge}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="absolute inset-0 cursor-zoom-in"
          aria-label={t.product.zoom}
        />
        {count > 1 ? (
          <>
            <GalleryArrow side="left" onClick={() => go(active - 1)} label={t.product.prevImage} />
            <GalleryArrow side="right" onClick={() => go(active + 1)} label={t.product.nextImage} />
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="flex gap-3">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={t.product.showImage(index + 1)}
                aria-current={index === active}
                className={`photo-tile relative block h-[74px] w-[74px] transition ${
                  index === active
                    ? 'ring-2 ring-accent2'
                    : 'ring-1 ring-transparent hover:ring-line2'
                }`}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="74px"
                  className="object-contain p-1.5"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {zoomed ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={name}
          className="fixed inset-0 z-50 grid place-items-center bg-bg/95 p-6 backdrop-blur"
          onClick={() => setZoomed(false)}
        >
          <div className="photo-tile relative h-full max-h-[80vh] w-full max-w-[900px]">
            <Image
              src={images[active].url}
              alt={images[active].alt ?? name}
              fill
              sizes="90vw"
              className="object-contain p-10"
            />
          </div>
          <button type="button" className="btn btn-ghost mt-5" onClick={() => setZoomed(false)}>
            {t.common.close}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function GalleryArrow({
  side,
  onClick,
  label,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/85 text-bg shadow-soft transition hover:bg-white ${
        side === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      <ArrowIcon className={`h-4 w-4 ${side === 'left' ? 'rotate-180' : ''}`} />
    </button>
  );
}
