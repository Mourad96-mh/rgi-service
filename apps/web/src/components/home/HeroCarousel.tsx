'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { HeroSlide } from '@/data/hero-slides';
import { t } from '@/locales/fr';
import { ArrowIcon, BoltIcon } from '@/components/ui/Icons';

const AUTOPLAY_MS = 6500;
const SWIPE_PX = 45;

const TINT: Record<HeroSlide['tint'], { left: string; right: string }> = {
  violet: { left: 'rgba(124,92,255,.45)', right: 'rgba(34,211,238,.28)' },
  cyan: { left: 'rgba(34,211,238,.38)', right: 'rgba(124,92,255,.35)' },
  pink: { left: 'rgba(255,77,141,.34)', right: 'rgba(124,92,255,.38)' },
};

/**
 * Homepage carousel — the pattern casaconfig.ma uses, rebuilt on our own tokens.
 *
 * All slides are in the DOM (one CSS transform moves the track), so the first slide is
 * server-rendered and is the LCP element. Autoplay stops on hover, on keyboard focus,
 * when the tab is hidden and when the visitor asked for reduced motion; arrows, dots,
 * the ← → keys and touch swipe all drive the same `goTo`.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const startX = useRef<number | null>(null);

  const goTo = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <section
      className="relative overflow-hidden pb-6 pt-5 sm:pt-8"
      aria-roledescription="carrousel"
      aria-label={t.home.carouselLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') prev();
        if (event.key === 'ArrowRight') next();
      }}
      onPointerDown={(event) => {
        startX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (startX.current === null) return;
        const delta = event.clientX - startX.current;
        startX.current = null;
        if (delta <= -SWIPE_PX) next();
        if (delta >= SWIPE_PX) prev();
      }}
    >
      {/* The section clips these, so they never widen the page; the fluid size stops a
          520 px glow from washing out an entire 360 px screen. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[22vw] -top-[120px] h-[min(520px,95vw)] w-[min(520px,95vw)] blur-[30px] transition-[background] duration-700"
        style={{ background: `radial-gradient(circle, ${TINT[slides[index].tint].left}, transparent 65%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[20vw] top-[40px] h-[min(480px,90vw)] w-[min(480px,90vw)] blur-[30px] transition-[background] duration-700"
        style={{ background: `radial-gradient(circle, ${TINT[slides[index].tint].right}, transparent 65%)` }}
      />

      <div className="wrap relative z-10">
        <div className="overflow-hidden rounded-lg2">
          <div
            className="flex transition-transform duration-[600ms] ease-[cubic-bezier(.22,.8,.3,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((slide, i) => (
              <Slide key={slide.id} slide={slide} position={i} total={count} active={i === index} />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 sm:mt-5">
          {/*
           * The dot is 6 px tall, which is nowhere near a tap target. The *button* is
           * 44 px tall with the dot drawn inside it, so the look is unchanged and the
           * hit area is real. Horizontal padding replaces the row gap for the same reason.
           */}
          <div className="-my-2 flex">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-current={i === index}
                aria-label={t.home.carouselGoTo(i + 1)}
                onClick={() => goTo(i)}
                className="grid h-11 shrink-0 place-items-center px-1.5"
              >
                <span
                  aria-hidden
                  className={`block h-[6px] rounded-full transition-all ${
                    i === index ? 'w-8 bg-grad shadow-glow' : 'w-3 bg-white/20 hover:bg-white/40'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={prev} aria-label={t.home.carouselPrev} className="icobtn">
              <ArrowIcon className="h-4 w-4 rotate-180" />
            </button>
            <button type="button" onClick={next} aria-label={t.home.carouselNext} className="icobtn">
              <ArrowIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Slide({
  slide,
  position,
  total,
  active,
}: {
  slide: HeroSlide;
  position: number;
  total: number;
  active: boolean;
}) {
  return (
    <div
      className="w-full shrink-0 px-px"
      role="group"
      aria-roledescription="diapositive"
      aria-label={`${position + 1} / ${total}`}
      aria-hidden={!active}
    >
      <div className="grid items-center gap-6 rounded-lg2 border border-line2 bg-surface/60 p-5 backdrop-blur-[6px] sm:gap-8 sm:p-7 md:p-10 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <span className="pill">
            {slide.id === 'configurator' ? <BoltIcon className="h-3.5 w-3.5 text-accent2" /> : null}
            {slide.pill}
          </span>
          <h2 className="t-display my-4 font-display font-bold sm:my-[18px]">
            {slide.title1}
            <br />
            <span className="grad-text">{slide.title2}</span>
          </h2>
          <p className="mb-6 max-w-[470px] text-[15px] text-muted sm:mb-7 sm:text-[16.5px]">
            {slide.text}
          </p>
          <Link
            href={slide.href}
            className="btn btn-primary"
            tabIndex={active ? undefined : -1}
          >
            {slide.cta}
            <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="photo-tile relative aspect-[4/3] w-full">
          <Image
            src={slide.image}
            alt={slide.imageAlt}
            fill
            sizes="(max-width:1024px) 90vw, 45vw"
            className="object-contain p-4 sm:p-6"
            priority={position === 0}
          />
        </div>
      </div>
    </div>
  );
}
