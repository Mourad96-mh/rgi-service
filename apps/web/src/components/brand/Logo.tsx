import { LogoMark } from './LogoMark';

/**
 * The Rgi Service lockup, stacked the way the client's artwork and the shop sign read:
 * the RGI mark, with "Service" set beneath it across the same width.
 *
 * The mark is the client's own vector artwork. "Service" is **live text**, not artwork:
 * the supplied `Logo2023rgi.pdf` contains the RGI mark only, and keeping the word as text
 * means it stays selectable and translatable (CLAUDE.md §6 — Arabic later).
 *
 * `Orbitron` is the closest match on Google Fonts to the squared, wide Eurostile-style
 * lettering in the client's reference — see `PROGRESS.md`. If the client ever supplies a
 * vector that already includes "Service", it should replace this text.
 *
 * Both parts inherit `currentColor`, so one component is white on the dark chrome.
 */
export function Logo({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  // The wordmark is sized to sit flush with the mark above it. The mark is 2.139:1, so a
  // mark of height H is 2.139H wide; Orbitron 700 sets "Service" at roughly 5.2× its font
  // size in mixed case, hence the ~0.41 ratio. Tracking closes the remaining gap.
  //
  // The default size is fluid rather than a flat 34 px: at 34 the lockup is ~73 px wide,
  // and on a 320 px header sharing the row with four 44 px tap targets that is the
  // difference between fitting and wrapping. It reaches its full size by ~740 px. Both
  // terms shrink by the same ratio so the two halves stay optically locked together.
  const s =
    size === 'sm'
      ? { mark: '26px', word: '10.5px' }
      : { mark: 'clamp(27px, 4.6vw, 34px)', word: 'clamp(10.75px, 1.83vw, 13.5px)' };

  return (
    <span
      className={`inline-flex shrink-0 flex-col items-center whitespace-nowrap leading-none ${className ?? ''}`}
    >
      <LogoMark
        className="w-auto text-text"
        style={{ height: s.mark }}
      />
      <span
        // Mixed case, exactly as the client's artwork sets it — not uppercase.
        className="font-wordmark font-bold text-text"
        style={{
          fontSize: s.word,
          letterSpacing: '.055em',
          // Pull the word up under the mark: the artwork's own baseline sits high because
          // the crescent sweeps below the letters.
          marginTop: size === 'sm' ? -1 : -2,
          // Indent by the tracking so the optical block stays centred.
          textIndent: '.055em',
        }}
      >
        Service
      </span>
    </span>
  );
}
