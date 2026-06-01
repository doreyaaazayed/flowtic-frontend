import { type ComponentType } from 'react';
import { motion } from 'motion/react';
import { isLitePerformance } from '../lib/performanceProfile';
import {
  Heart,
  Music2,
  Trophy,
  ShoppingBag,
  Gem,
  Disc3,
  Mic2,
  Volleyball,
  Medal,
  Store,
  Coffee,
  Sparkles,
  PartyPopper,
  Flower2,
} from 'lucide-react';

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

/* =============================================================
   THE STAGE — INK-Games-style theatrical hero composition
   Four themed 3D-style SVG props placed around the headline.
   Each prop is a self-contained SVG with multi-stop gradients,
   specular highlights and a coloured ground glow. Float and
   hover-tilt are CSS-only so there's zero scroll-time JS cost.
   ============================================================= */

/* ---------- 1. Soccer ball — football matches ----------
   Renders the real Adidas Trionda image (placed in /public/assets/),
   cropped to a circle with a radial mask so the source PNG's black
   square backdrop is hidden. A coloured halo sits behind the ball
   for the same chromatic glow the other props get. */
function SoccerBallProp() {
  return (
    <div className="relative h-full w-full" aria-hidden>
      {/* Cyan/blue chromatic halo, sized slightly larger than the ball */}
      <div
        className="absolute inset-[-6%]"
        style={{
          background:
            'radial-gradient(circle at 50% 55%, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0) 62%)',
        }}
      />
      {/* The Trionda PNG — circular mask crops out the black backdrop */}
      <img
        src="/assets/football.png"
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full select-none"
        style={{
          objectFit: 'cover',
          objectPosition: 'center',
          maskImage:
            'radial-gradient(circle at 50% 49%, #000 38%, #000 40%, transparent 44%)',
          WebkitMaskImage:
            'radial-gradient(circle at 50% 49%, #000 38%, #000 40%, transparent 44%)',
        }}
      />
    </div>
  );
}

/* ---------- 2. Vinyl record — music concerts ---------- */
function VinylProp() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="vinyl-body" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a0b2e" />
          <stop offset="55%" stopColor="#0a0612" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <radialGradient id="vinyl-label" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="60%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        <radialGradient id="vinyl-glow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="rgba(168,85,247,0.7)" />
          <stop offset="100%" stopColor="rgba(168,85,247,0)" />
        </radialGradient>
        <radialGradient id="vinyl-shine" cx="35%" cy="30%" r="28%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#vinyl-glow)" opacity="0.6" />
      <circle cx="100" cy="100" r="85" fill="url(#vinyl-body)" />
      {/* Grooves */}
      {[80, 72, 64, 56, 48, 42].map((r) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.6" />
      ))}
      <circle cx="100" cy="100" r="30" fill="url(#vinyl-label)" />
      <circle cx="100" cy="100" r="3" fill="#0a0612" />
      <ellipse cx="75" cy="68" rx="38" ry="24" fill="url(#vinyl-shine)" transform="rotate(-25 75 68)" />
      <ellipse cx="100" cy="190" rx="60" ry="5" fill="rgba(0,0,0,0.4)" />
    </svg>
  );
}

/* ---------- 3. Diamond ring — weddings ---------- */
function RingProp() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ring-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe6a8" />
          <stop offset="45%" stopColor="#f0c674" />
          <stop offset="100%" stopColor="#a86d2c" />
        </linearGradient>
        <linearGradient id="ring-diamond" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
        <radialGradient id="ring-glow" cx="50%" cy="58%" r="55%">
          <stop offset="0%" stopColor="rgba(240,198,116,0.65)" />
          <stop offset="100%" stopColor="rgba(240,198,116,0)" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="120" r="98" fill="url(#ring-glow)" opacity="0.6" />
      {/* Ring band */}
      <ellipse cx="100" cy="130" rx="58" ry="55" fill="none" stroke="url(#ring-gold)" strokeWidth="14" />
      <ellipse cx="100" cy="130" rx="51" ry="48" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
      {/* Setting prongs */}
      <path d="M 86,72 L 90,52 M 100,68 L 100,46 M 114,72 L 110,52" stroke="url(#ring-gold)" strokeWidth="3" strokeLinecap="round" />
      {/* Diamond */}
      <g transform="translate(100,52)">
        <polygon points="0,-22 16,-6 11,14 -11,14 -16,-6" fill="url(#ring-diamond)" />
        <polygon points="0,-22 16,-6 0,-3" fill="rgba(255,255,255,0.7)" />
        <polygon points="-16,-6 11,14 -11,14" fill="rgba(125,211,252,0.55)" />
        <line x1="-16" y1="-6" x2="16" y2="-6" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
        <line x1="0" y1="-22" x2="0" y2="14" stroke="rgba(255,255,255,0.3)" strokeWidth="0.7" />
      </g>
      {/* Sparkles */}
      <g fill="#fef3c7">
        <circle cx="48" cy="48" r="2.4" opacity="0.9" />
        <circle cx="158" cy="44" r="2" opacity="0.85" />
        <circle cx="36" cy="108" r="1.6" opacity="0.7" />
        <circle cx="168" cy="118" r="1.6" opacity="0.7" />
      </g>
      <ellipse cx="100" cy="192" rx="55" ry="4" fill="rgba(0,0,0,0.3)" />
    </svg>
  );
}

/* ---------- 4. Brass lantern — bazaars ---------- */
function LanternProp() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="lantern-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd99a" />
          <stop offset="45%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <linearGradient id="lantern-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c2d12" />
          <stop offset="40%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <radialGradient id="lantern-flame" cx="50%" cy="60%" r="45%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="55%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="rgba(251,146,60,0)" />
        </radialGradient>
        <radialGradient id="lantern-glow" cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="rgba(251,146,60,0.7)" />
          <stop offset="100%" stopColor="rgba(251,146,60,0)" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#lantern-glow)" opacity="0.65" />
      {/* Hanging hook */}
      <path d="M 100,16 Q 100,4 90,4 Q 80,4 80,16" fill="none" stroke="url(#lantern-brass)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="20" r="3" fill="#fcd99a" />
      {/* Top cap */}
      <path d="M 68,30 L 132,30 L 124,52 L 76,52 Z" fill="url(#lantern-side)" />
      <path d="M 76,52 L 124,52 L 122,56 L 78,56 Z" fill="#7c2d12" />
      {/* Glass body */}
      <rect x="80" y="56" width="40" height="72" rx="5" fill="rgba(251,146,60,0.18)" stroke="url(#lantern-brass)" strokeWidth="3" />
      {/* Vertical frame ribs */}
      <line x1="92" y1="56" x2="92" y2="128" stroke="url(#lantern-brass)" strokeWidth="2" />
      <line x1="108" y1="56" x2="108" y2="128" stroke="url(#lantern-brass)" strokeWidth="2" />
      {/* Flame inside */}
      <ellipse cx="100" cy="94" rx="14" ry="22" fill="url(#lantern-flame)" />
      <ellipse cx="100" cy="96" rx="6" ry="13" fill="#fef3c7" opacity="0.9" />
      {/* Base */}
      <path d="M 72,128 L 128,128 L 124,144 L 76,144 Z" fill="url(#lantern-side)" />
      <rect x="76" y="144" width="48" height="6" rx="2" fill="#7c2d12" />
      <ellipse cx="100" cy="192" rx="50" ry="4" fill="rgba(0,0,0,0.3)" />
    </svg>
  );
}

/* =============================================================
   Theme dictionary — one entry per supported event vertical
   ============================================================= */
const THEMES = {
  weddings: {
    label: 'Weddings',
    sub: 'Black-tie, gold leaf',
    Icon: Heart,
    Prop: RingProp,
    gradient: 'linear-gradient(135deg,#f0c674 0%,#ffd98a 50%,#d18b6e 100%)',
    glow: '0 10px 30px -8px rgba(240,198,116,0.6)',
  },
  music: {
    label: 'Music concerts',
    sub: 'Stadium-scale sound',
    Icon: Music2,
    Prop: VinylProp,
    gradient: 'linear-gradient(135deg,#a855f7 0%,#c084fc 50%,#7c3aed 100%)',
    glow: '0 10px 30px -8px rgba(168,85,247,0.6)',
  },
  football: {
    label: 'Football matches',
    sub: 'Stadium-day energy',
    Icon: Trophy,
    Prop: SoccerBallProp,
    gradient: 'linear-gradient(135deg,#22d3ee 0%,#3b82f6 50%,#1d4ed8 100%)',
    glow: '0 10px 30px -8px rgba(59,130,246,0.6)',
  },
  bazaars: {
    label: 'Bazaars',
    sub: 'Lanterns, makers, music',
    Icon: ShoppingBag,
    Prop: LanternProp,
    gradient: 'linear-gradient(135deg,#fb923c 0%,#f472b6 50%,#a855f7 100%)',
    glow: '0 10px 30px -8px rgba(251,146,60,0.55)',
  },
} as const;

type ThemeKey = keyof typeof THEMES;

/* =============================================================
   Stage prop — 3D-style SVG + floating label chip beneath
   ============================================================= */

function StageProp({
  theme,
  position,
  rotate,
  delay,
  size,
  /** When true, this prop renders ABOVE the headline (z-3) and can
      visually clip into the text edge — matches INK Games' stage feel. */
  inFront = false,
}: {
  theme: ThemeKey;
  position: string;
  rotate: number;
  delay: number;
  size: number;
  inFront?: boolean;
}) {
  const t = THEMES[theme];
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, y: 40, scale: 0.85, rotate }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotate }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`pointer-events-none absolute ${position}`}
      style={{ zIndex: inFront ? 3 : 1 }}
    >
      <div
        className="lg-stage-prop"
        style={{ width: size, height: size, animationDelay: `${-delay * 2}s` }}
      >
        {/* The 3D-style SVG */}
        <t.Prop />
      </div>
      {/* Theme label chip — anchored under the prop so it reads as a tag */}
      <div
        className="lg-stage-prop__label mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
        style={{
          background: 'var(--lg-bg)',
          borderColor: 'var(--lg-border-strong)',
          boxShadow: `var(--lg-shadow), ${t.glow}`,
          backdropFilter: 'blur(14px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
        }}
      >
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white"
          style={{ background: t.gradient }}
        >
          <t.Icon className="h-[12px] w-[12px]" strokeWidth={2.4} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground">
          {t.label}
        </span>
      </div>
    </motion.div>
  );
}

/* =============================================================
   Deep-background ghost icons — thinned for stage clarity
   ============================================================= */

interface Ghost {
  Icon: IconType;
  top: string;
  left?: string;
  right?: string;
  size: number;
  rotate: number;
  tint: string;
  opacity: number;
  delay: number;
}

const GHOSTS: Ghost[] = [
  { Icon: Disc3,       top: '24%', left: '22%',               size: 36, rotate:  22, tint: '#c084fc', opacity: 0.07, delay: 0.4 },
  { Icon: Volleyball,  top: '70%', left: '36%',               size: 38, rotate:   0, tint: '#22d3ee', opacity: 0.08, delay: 0.8 },
  { Icon: Gem,         top: '28%',              right: '26%', size: 38, rotate:  -6, tint: '#f0c674', opacity: 0.08, delay: 1.0 },
  { Icon: Mic2,        top: '66%',              right: '30%', size: 34, rotate:  16, tint: '#a855f7', opacity: 0.07, delay: 1.2 },
  { Icon: Coffee,      top: '46%', left: '2%',                size: 30, rotate: -10, tint: '#fb923c', opacity: 0.06, delay: 1.4 },
  { Icon: Medal,       top: '48%',              right: '2%',  size: 32, rotate:   8, tint: '#3b82f6', opacity: 0.06, delay: 1.6 },
  { Icon: Flower2,     top: '82%', left: '18%',               size: 32, rotate:  -6, tint: '#f472b6', opacity: 0.07, delay: 1.8 },
  { Icon: Store,       top: '8%',  left: '40%',               size: 30, rotate:  -4, tint: '#fb923c', opacity: 0.05, delay: 2.0 },
  { Icon: PartyPopper, top: '14%',              right: '36%', size: 32, rotate:  12, tint: '#c084fc', opacity: 0.06, delay: 2.2 },
  { Icon: Sparkles,    top: '38%', left: '48%',               size: 24, rotate:   0, tint: '#ffd98a', opacity: 0.06, delay: 2.4 },
];

function GhostIcon({ Icon, top, left, right, size, rotate, tint, opacity, delay, lite = false }: Ghost & { lite?: boolean }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity, scale: 1 }}
      transition={{ duration: lite ? 0.55 : 1.6, delay: lite ? delay * 0.25 : delay, ease: [0.22, 1, 0.36, 1] }}
      className={`lg-ghost-icon pointer-events-none absolute ${lite ? '' : 'lg-float'}`}
      style={{
        top,
        left,
        right,
        width: size,
        height: size,
        animationDelay: lite ? undefined : `${-delay * 1.5}s`,
        animationDuration: lite ? undefined : `${8 + delay * 1.2}s`,
        transform: `rotate(${rotate}deg)`,
        filter: lite ? undefined : `drop-shadow(0 0 14px ${tint}aa)`,
        color: tint,
      }}
    >
      <Icon className="h-full w-full" strokeWidth={1.4} />
    </motion.div>
  );
}

/* =============================================================
   Exported backdrop — pointer-events:none so it never blocks UI
   ============================================================= */

export function EventThemeBackdrop() {
  const lite = isLitePerformance();
  const ghosts = lite ? GHOSTS.slice(0, 3) : GHOSTS;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {ghosts.map((g, i) => (
        <GhostIcon key={i} {...g} lite={lite} />
      ))}

      {/* The four stage props (lg+ only — too crowded on mobile).
          Top two sit behind the headline (z-1); bottom two are pushed
          in front (z-3) so they clip into the text edge — INK-stage feel. */}
      <div className="hidden lg:block">
        <StageProp theme="music"    position="left-[2%]  top-[10%]"     rotate={-10} delay={0.40} size={150} />
        <StageProp theme="weddings" position="right-[3%] top-[6%]"      rotate={9}   delay={0.55} size={150} />
        <StageProp theme="football" position="left-[3%]  bottom-[6%]"   rotate={6}   delay={0.70} size={170} inFront />
        <StageProp theme="bazaars"  position="right-[3%] bottom-[8%]"   rotate={-7}  delay={0.85} size={160} inFront />
      </div>
    </div>
  );
}
