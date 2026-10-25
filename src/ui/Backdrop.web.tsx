/**
 * Living colour background (web / home-screen app).
 *
 * Soft colour glows at the top of the screen that drift slowly, the sun or moon on Today,
 * stars at night, and film grain so gradients never band on an OLED screen.
 * Transform-only CSS animation (GPU), off for reduce motion. Content scrolls over it.
 */
import { useMemo } from 'react';

import { useNow } from '@/lib/useNow';
import { useStore } from '@/lib/store';

import { MIDNIGHT, glowFor, rgba, type BackdropTone } from './glow';

const CSS = `
@keyframes gg-drift-a { 0% { transform: translate3d(-5%, -3%, 0) scale(1); } 100% { transform: translate3d(6%, 4%, 0) scale(1.14); } }
@keyframes gg-drift-b { 0% { transform: translate3d(5%, 0, 0) scale(1.1); } 100% { transform: translate3d(-7%, 5%, 0) scale(0.94); } }
@keyframes gg-drift-c { 0% { transform: translate3d(-3%, 4%, 0) scale(0.92); } 100% { transform: translate3d(4%, -4%, 0) scale(1.12); } }
@keyframes gg-breathe { 0%, 100% { transform: translate3d(-50%, -50%, 0) scale(1); } 50% { transform: translate3d(-50%, -50%, 0) scale(1.08); } }
@keyframes gg-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
.gg-blob { position: absolute; border-radius: 50%; will-change: transform; }
.gg-light { mix-blend-mode: screen; }
.gg-star { position: absolute; border-radius: 50%; background: #fff; animation: gg-twinkle 4.5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .gg-blob, .gg-star { animation: none !important; } }
`;

if (typeof document !== 'undefined' && !document.getElementById('gg-backdrop-css')) {
  const el = document.createElement('style');
  el.id = 'gg-backdrop-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

/** Film grain: a tiny tiled SVG noise, a few percent opaque. Kills gradient banding. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")";

/** Fixed star positions (percent of width / height), so render stays pure. */
const STARS = Array.from({ length: 28 }, (_, i) => {
  const r = (k: number) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  // Keep the middle clear: big numbers and titles sit there, and a star next to text reads as a typo.
  const side = r(1) < 0.5 ? r(6) * 20 : 80 + r(6) * 20;
  return { x: side, y: 2 + r(2) * 38, s: 1 + r(3) * 1.6, d: r(4) * 4.5, o: 0.35 + r(5) * 0.6 };
});

const fill = { position: 'absolute', inset: 0 } as const;
/** Grain only over the top 60% (where the colour is); overlay keeps black pixels black. */
const grain = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  height: '60%',
  backgroundImage: GRAIN,
  mixBlendMode: 'overlay',
  maskImage: 'linear-gradient(180deg, #000 55%, transparent)',
  WebkitMaskImage: 'linear-gradient(180deg, #000 55%, transparent)',
} as const;
const soft = (c: string, a: number) =>
  `radial-gradient(closest-side, ${rgba(c, a)}, ${rgba(c, a * 0.5)} 42%, ${rgba(c, a * 0.12)} 72%, ${rgba(c, 0)})`;

const dayKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function Backdrop({ tone }: { tone: BackdropTone }) {
  const { settings, days } = useStore();
  const [now] = useNow(60_000);
  const style = settings.background === 'midnight' || settings.background === 'black' ? settings.background : 'living';
  const valence = tone === 'today' ? days[dayKeyOf(new Date(now))]?.checkin?.valence : undefined;
  const glow = useMemo(() => (style === 'living' ? glowFor(tone, new Date(now), valence) : null), [style, tone, now, valence]);

  if (style === 'black' || tone === 'none') return null;

  if (style === 'midnight') {
    return (
      <div aria-hidden style={{ ...fill, pointerEvents: 'none', overflow: 'hidden' }}>
        <div
          style={{
            ...fill,
            background: `linear-gradient(180deg, ${MIDNIGHT.top} 0%, ${MIDNIGHT.mid} 46%, ${MIDNIGHT.bottom} 100%)`,
          }}
        />
        <div style={{ ...grain, opacity: 0.05 }} />
      </div>
    );
  }
  if (!glow) return null;
  const [a, b, c] = glow.colors;
  const [aa, ab, ac] = glow.alpha;
  const L = glow.light;

  return (
    <div aria-hidden style={{ ...fill, pointerEvents: 'none', overflow: 'hidden', background: '#000', isolation: 'isolate' }}>
      <div
        className="gg-blob"
        style={{
          left: '-40%',
          top: '-30%',
          width: '125%',
          height: '66%',
          background: soft(a, aa),
          animation: 'gg-drift-a 23s ease-in-out infinite alternate',
        }}
      />
      <div
        className="gg-blob"
        style={{
          right: '-45%',
          top: '-22%',
          width: '120%',
          height: '60%',
          background: soft(b, ab),
          animation: 'gg-drift-b 29s ease-in-out infinite alternate',
        }}
      />
      <div
        className="gg-blob"
        style={{
          left: '-15%',
          top: '18%',
          width: '130%',
          height: '48%',
          background: soft(c, ac),
          animation: 'gg-drift-c 19s ease-in-out infinite alternate',
        }}
      />
      {glow.stars
        ? STARS.map((s, i) => (
            <div
              key={i}
              className="gg-star"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: s.o, animationDelay: `${s.d}s` }}
            />
          ))
        : null}
      {L ? (
        <div
          className="gg-blob gg-light"
          style={{
            left: `${L.x}%`,
            top: `${L.y}%`,
            width: `${L.size}vw`,
            height: `${L.size}vw`,
            maxWidth: 520,
            maxHeight: 520,
            background: `radial-gradient(closest-side, ${rgba(L.color, L.alpha)}, ${rgba(L.color, L.alpha * 0.42)} 30%, ${rgba(L.color, L.alpha * 0.1)} 62%, ${rgba(L.color, 0)})`,
            animation: 'gg-breathe 9s ease-in-out infinite',
            transform: 'translate3d(-50%, -50%, 0)',
          }}
        />
      ) : null}
      <div style={{ ...grain, opacity: 0.06 }} />
    </div>
  );
}
