import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Calendar, MapPin, ArrowUpRight, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventCardImageSrc } from '../lib/eventImage';

interface EventCardProps {
  event: {
    id: number | string;
    title: string;
    category: string;
    date: string;
    location: string;
    price: number;
    image: string;
    featured?: boolean;
  };
}

function eventsEqual(a: EventCardProps, b: EventCardProps) {
  const ea = a.event;
  const eb = b.event;
  return (
    ea.id === eb.id &&
    ea.title === eb.title &&
    ea.category === eb.category &&
    ea.date === eb.date &&
    ea.location === eb.location &&
    ea.price === eb.price &&
    ea.image === eb.image &&
    ea.featured === eb.featured
  );
}

const CATEGORY_TINTS: Record<string, string> = {
  music: 'linear-gradient(135deg, #f0abfc, #8b5cf6)',
  concert: 'linear-gradient(135deg, #f0abfc, #8b5cf6)',
  sports: 'linear-gradient(135deg, #34d399, #06b6d4)',
  arts: 'linear-gradient(135deg, #fb923c, #f43f5e)',
  business: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  corporate: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  tech: 'linear-gradient(135deg, #06b6d4, #34d399)',
  food: 'linear-gradient(135deg, #fb923c, #fcd34d)',
  festival: 'linear-gradient(135deg, #f43f5e, #fb923c)',
  default: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
};

function tintFor(cat: string) {
  const k = cat.toLowerCase();
  const found = Object.keys(CATEGORY_TINTS).find((c) => c !== 'default' && k.includes(c));
  return CATEGORY_TINTS[found ?? 'default'];
}

function EventCardImpl({ event }: EventCardProps) {
  const { t, i18n } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const imageSrc = useMemo(
    () => (imgFailed ? eventCardImageSrc('') : eventCardImageSrc(event.image)),
    [event.image, imgFailed],
  );

  const tint = tintFor(event.category);

  let daysLeft: number | null = null;
  try {
    const d = new Date(event.date).getTime();
    if (!Number.isNaN(d)) daysLeft = Math.ceil((d - Date.now()) / (1000 * 60 * 60 * 24));
  } catch {
    daysLeft = null;
  }

  const onMove = useCallback((e: React.MouseEvent) => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!window.matchMedia('(pointer: fine)').matches) return;
    }
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const rx = (y - 0.5) * -10;
    const ry = (x - 0.5) * 14;
    if (innerRef.current) {
      innerRef.current.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    }
    if (sheenRef.current) {
      sheenRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.18) 0%, transparent 55%)`;
    }
  }, []);

  const onLeave = useCallback(() => {
    setHovered(false);
    if (innerRef.current) {
      innerRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0)';
    }
    if (sheenRef.current) sheenRef.current.style.background = 'transparent';
  }, []);

  const dateLabel = (() => {
    try {
      const locale = i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US';
      return new Date(event.date).toLocaleDateString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return event.date;
    }
  })();

  return (
    <Link to={`/event/${event.id}`} className="block">
      <div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={onLeave}
        className="lg-card lg-3d group relative h-full overflow-hidden"
        style={{ borderRadius: 'var(--radius)' }}
      >
        <div
          ref={innerRef}
          className="lg-3d-inner relative h-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Image */}
          <div className="relative aspect-[16/10] w-full overflow-hidden" style={{ borderRadius: 'inherit' }}>
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: tint, opacity: imgLoaded && !imgFailed ? 0 : 0.35 }}
            />
            <img
              src={imageSrc}
              alt={event.title}
              loading="lazy"
              decoding="async"
              width={640}
              height={400}
              onLoad={() => {
                setImgLoaded(true);
                setImgFailed(false);
              }}
              onError={() => {
                setImgFailed(true);
                setImgLoaded(true);
              }}
              className="h-full w-full object-cover transition-[opacity,transform] duration-700 group-hover:scale-110"
              style={{ opacity: imgLoaded ? 1 : 0.15 }}
            />
            {/* Bottom darkening for legibility */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, transparent 35%, rgba(5,6,20,0.55) 70%, rgba(5,6,20,0.92) 100%)',
              }}
            />
            {/* Category tint glow on hover */}
            <div
              aria-hidden
              className="absolute -inset-10 transition-opacity duration-500"
              style={{
                background: tint,
                filter: 'blur(60px)',
                opacity: hovered ? 0.35 : 0,
              }}
            />

            {/* Top chips */}
            <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
              {event.featured ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
                  style={{
                    background: 'linear-gradient(135deg, #fb923c, #f43f5e)',
                    boxShadow: '0 6px 16px -4px rgba(244,63,94,0.55)',
                  }}
                >
                  <Flame className="h-3 w-3" /> {t('events.featured')}
                </span>
              ) : <span />}
              <span
                className="inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
                style={{
                  background: 'rgba(8,10,24,0.55)',
                  backdropFilter: 'blur(12px) saturate(1.3)',
                  WebkitBackdropFilter: 'blur(12px) saturate(1.3)',
                  borderColor: 'rgba(255,255,255,0.16)',
                }}
              >
                {event.category}
              </span>
            </div>

            {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
              <span
                className="absolute bottom-4 right-4 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{
                  background: 'rgba(244,63,94,0.18)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderColor: 'rgba(244,63,94,0.45)',
                  color: '#fda4af',
                }}
              >
                {t('events.daysLeft', { n: daysLeft })}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="relative p-5">
            <h3 className="mb-3 line-clamp-2 text-lg font-semibold leading-snug tracking-[-0.005em] text-foreground">
              {event.title}
            </h3>

            <div className="mb-5 flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#a78bfa]" />
                <span>{dateLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#67e8f9]" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--lg-border)' }}>
              <div className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {t('events.startingAt')}
                </span>
                <span
                  className="text-2xl font-extrabold leading-none tracking-[-0.02em]"
                  style={{
                    background: tint,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  EGP {event.price}
                </span>
              </div>
              <span
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all group-hover:bg-white/5"
                style={{ borderColor: 'var(--lg-border-strong)', color: 'var(--foreground)' }}
              >
                {t('events.open')}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Sheen following cursor */}
        <div
          ref={sheenRef}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ mixBlendMode: 'screen', zIndex: 3 }}
        />
      </div>
    </Link>
  );
}

export const EventCard = memo(EventCardImpl, eventsEqual);
