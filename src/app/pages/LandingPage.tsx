import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  Users,
  Ticket,
  ShieldCheck,
  Sparkles,
  Music,
  Trophy,
  Briefcase,
  PartyPopper,
  GraduationCap,
  Heart,
  Building2,
  Camera,
  Zap,
  CheckCircle2,
  ScanFace,
  Star,
  Gem,
  Quote,
  Calendar,
  Mic2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trans, useTranslation } from 'react-i18next';
import { AIBadge } from '../components/AIBadge';
import { EventCard } from '../components/EventCard';
import { LandingResaleSpotlight } from '../components/landing/LandingResaleSpotlight';
import { isLitePerformance } from '../lib/performanceProfile';
import { resolveEventImageSrc } from '../lib/eventImage';
import {
  Reveal,
  Section,
  SectionHeader,
  Eyebrow,
  Stat,
  Pill,
  Marquee,
  ParticleField,
  Magnetic,
  EventThemeBackdrop,
} from '../liquid';
import { events as eventsApi, categories as categoriesApi, venues as venuesApi } from '../lib/api';
import { ParallaxLayer, ScrollOrb } from '../cinematic/Parallax';
import { ScrollFadeRise } from '../cinematic/ScrollFadeRise';


const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  Music,
  Trophy,
  Briefcase,
  Sparkles: PartyPopper,
  GraduationCap,
  Heart,
  Building2,
  Camera,
  default: Music,
};

const EVENT_VERTICALS = [
  { Icon: Heart, key: 'weddings', accent: '#f0c674' },
  { Icon: Building2, key: 'corporate', accent: '#3b82f6' },
  { Icon: Music, key: 'concerts', accent: '#a855f7' },
  { Icon: Trophy, key: 'sports', accent: '#22d3ee' },
  { Icon: PartyPopper, key: 'parties', accent: '#f472b6' },
  { Icon: Briefcase, key: 'conferences', accent: '#60a5fa' },
  { Icon: Mic2, key: 'bazaars', accent: '#fb923c' },
  { Icon: GraduationCap, key: 'galas', accent: '#c084fc' },
];

const PRESS = ['TechCrunch', 'Forbes', 'WIRED', 'Bloomberg', 'Fast Company', 'The Verge'];

export function LandingPage() {
  const { t } = useTranslation();
  const [eventsList, setEventsList] = useState<
    Array<{
      _id: string;
      Name: string;
      CategoryID: number;
      StartDate: string;
      VenueID: number;
      Status: string;
      imageUrl?: string;
      minPrice?: number;
    }>
  >([]);
  const [categoriesList, setCategoriesList] = useState<
    Array<{ _id: string; CategoryID: number; Name: string }>
  >([]);
  const [venuesList, setVenuesList] = useState<
    Array<{ VenueID: number; Location: string; Name: string }>
  >([]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      eventsApi.list({ page: 1, limit: 8 }, { signal: controller.signal }),
      categoriesApi.list({ publicOnly: true }),
      venuesApi.list(),
    ])
      .then(([ev, cat, ven]) => {
        if (controller.signal.aborted) return;
        setEventsList(ev);
        setCategoriesList(cat);
        setVenuesList(ven);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const venueMap = useMemo(() => {
    const m: Record<number, string> = {};
    venuesList.forEach((v) => {
      m[v.VenueID] = v.Location || v.Name;
    });
    return m;
  }, [venuesList]);

  const categoryMap = useMemo(() => {
    const m: Record<number, string> = {};
    categoriesList.forEach((c) => {
      m[c.CategoryID] = c.Name;
    });
    return m;
  }, [categoriesList]);

  const featuredEvents = useMemo(
    () =>
      eventsList.slice(0, 6).map((ev) => ({
        id: ev._id,
        title: ev.Name,
        category: categoryMap[ev.CategoryID] ?? 'Event',
        date: ev.StartDate,
        location:
          ev.externalVenue?.location ||
          (ev.VenueID != null ? venueMap[ev.VenueID] : undefined) ||
          (ev.VenueID != null ? `Venue ${ev.VenueID}` : '—'),
        price: ev.minPrice ?? 0,
        image: resolveEventImageSrc(ev.imageUrl),
        featured: ev.Status === 'Active',
      })),
    [eventsList, categoryMap, venueMap],
  );

  const liteFx = isLitePerformance();

  return (
    <div className="relative">
      {/* ============================================================
          CINEMATIC HERO
          (We skip scroll-linked motion transforms on the hero ??? they force
          a layout read every scroll frame. The animations below are
          one-shot on mount, so they don't cost anything during scrolling.)
          ============================================================ */}
      <section className="relative isolate overflow-hidden pb-32 pt-12 md:pb-44 md:pt-16">
        <ScrollOrb className="-left-20 top-6 opacity-60" color="rgba(168,85,247,0.38)" size={300} speed={0.28} />
        <ScrollOrb className="-right-12 top-28 opacity-50" color="rgba(59,130,246,0.28)" size={220} speed={0.18} />
        {!liteFx && <ParticleField density={32} className="opacity-80" />}

        {/* Center spotlight wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(700px 360px at 50% 30%, rgba(168,85,247,0.18), transparent 70%)',
          }}
        />

        <div className="relative z-[2] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8 flex flex-col items-center gap-2.5"
            >
              <Pill tone="neon" leadingIcon={<Sparkles className="h-3.5 w-3.5" />}>
                {t('hero.pill')}
              </Pill>
              <motion.p
                initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.75, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="hero-slogan"
              >
                {t('hero.slogan')}
              </motion.p>
            </motion.div>

            <h1 className="display-hero text-balance" aria-label={t('hero.subtitle')}>
              <span className="block text-foreground">
                <span className="hero-word" style={{ animationDelay: '0ms' }}>{t('hero.title1')}</span>
              </span>
              <span className="block">
                <span
                  className="hero-word text-luxe text-shimmer"
                  style={{ animationDelay: '240ms' }}
                >
                  {t('hero.title2a')}
                </span>{' '}
                <span
                  className="hero-word font-serif italic font-normal text-foreground/80"
                  style={{ animationDelay: '360ms' }}
                >
                  {t('hero.title2b')}
                </span>{' '}
                <span
                  className="hero-word text-gold text-shimmer"
                  style={{ animationDelay: '480ms' }}
                >
                  {t('hero.title2c')}
                </span>
                <span className="hero-word text-foreground" style={{ animationDelay: '620ms' }}>
                  .
                </span>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-8 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg md:text-xl"
            >
              {t('hero.subtitle')}
            </motion.p>

            {/* Hero search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-12 max-w-2xl"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  window.location.href = '/events';
                }}
                className="lg-glass-pill relative flex flex-col items-stretch gap-2 rounded-3xl border p-2 sm:flex-row sm:items-center sm:rounded-full sm:p-1.5"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    padding: '1px',
                    background:
                      'linear-gradient(135deg, rgba(168,85,247,0.6), rgba(59,130,246,0.5) 50%, rgba(240,198,116,0.55))',
                    WebkitMask:
                      'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    opacity: 0.5,
                  }}
                />
                <span className="relative pl-3 text-muted-foreground">
                  <Search className="h-5 w-5" />
                </span>
                <input
                  name="q"
                  type="search"
                  aria-label={t('hero.searchBtn')}
                  placeholder={t('hero.searchPlaceholder')}
                  className="relative flex-1 bg-transparent px-1 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 sm:text-base"
                />
                <Magnetic strength={4}>
                  <button
                    type="submit"
                    className="lg-btn relative w-full sm:w-auto"
                    style={{ padding: '0.75rem 1.3rem' }}
                  >
                    {t('hero.searchBtn')}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Magnetic>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center"
            >
              <Magnetic strength={6}>
                <Link
                  to="/events"
                  className="lg-btn w-full justify-center sm:w-auto"
                  style={{ padding: '0.95rem 1.7rem' }}
                >
                  <Sparkles className="h-4 w-4" />
                  {t('hero.exploreEvents')}
                  <ArrowRight className="h-4 w-4 lg-arrow-flip" />
                </Link>
              </Magnetic>
              <Magnetic strength={6}>
                <Link
                  to="/creator-dashboard"
                  className="lg-btn lg-btn--ghost w-full justify-center sm:w-auto"
                  style={{ padding: '0.95rem 1.7rem' }}
                >
                  <Ticket className="h-4 w-4" />
                  {t('hero.hostEvent')}
                </Link>
              </Magnetic>
            </motion.div>
          </div>

          <ParallaxLayer speed={0.2} className="mx-auto mt-20 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {[
                { v: '15K+', l: t('stats.eventsLive'), h: t('stats.eventsLiveHint') },
                { v: '2.1M', l: t('stats.ticketsSold'), h: t('stats.ticketsSoldHint') },
                { v: '98%', l: t('stats.faceIdMatch'), h: t('stats.faceIdMatchHint') },
                { v: '4.9?', l: t('stats.hostRating'), h: t('stats.hostRatingHint') },
            ].map((s) => (
              <Stat key={s.l} value={s.v} label={s.l} hint={s.h} />
            ))}
            </motion.div>
          </ParallaxLayer>
        </div>

        {/*
          Themed event-vertical backdrop ??? INK-Games-style stage:
          - 4 hand-built SVG "3D" props (vinyl record, diamond ring,
            soccer ball, brass lantern) for music, weddings, football
            and bazaars respectively. Top two sit behind the headline;
            bottom two are pushed in front (z-3) so they clip into the
            text edge like a diorama.
          - A thin layer of low-opacity ghost icons for ambient depth.
        */}
        <EventThemeBackdrop />
      </section>

      {/* ============================================================
          PRESS MARQUEE
          ============================================================ */}
      <div className="relative border-y" style={{ borderColor: 'var(--lg-border)' }}>
        <Marquee className="py-6">
          {PRESS.map((p) => (
            <span
              key={p}
              className="text-base font-semibold uppercase tracking-[0.22em] text-muted-foreground"
            >
              {p}
            </span>
          ))}
          <span aria-hidden className="text-base text-muted-foreground/40">
            ?
          </span>
          <span className="text-base font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t('landing.press.tag')}
          </span>
          <span aria-hidden className="text-base text-muted-foreground/40">
            ?
          </span>
        </Marquee>
      </div>

      {/* ============================================================
          EVENT VERTICALS
          ============================================================ */}
      <Section>
        <Reveal>
          <SectionHeader
            eyebrow={<Eyebrow>{t('landing.verticals.eyebrow')}</Eyebrow>}
            title={
              <Trans
                i18nKey="landing.verticals.title"
                components={{ accent: <span className="text-luxe" /> }}
              />
            }
            subtitle={t('landing.verticals.subtitle')}
          />
        </Reveal>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {EVENT_VERTICALS.map((v, i) => (
            <Reveal key={v.key} delay={i * 40}>
              <Link to="/events" className="block">
                <div className="lg-card group h-full p-5 text-center">
                  <span
                    className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${v.accent}, rgba(255,255,255,0.05))`,
                      boxShadow: `0 1px 0 0 rgba(255,255,255,0.35) inset, 0 8px 20px -8px ${v.accent}`,
                    }}
                  >
                    <v.Icon className="h-6 w-6 text-white" />
                  </span>
                  <h3 className="text-sm font-bold tracking-tight">
                    {t(`landing.verticals.labels.${v.key}`)}
                  </h3>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t('landing.verticals.browse')}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ============================================================
          FEATURED EVENTS
          ============================================================ */}
      <Section>
        <Reveal>
          <SectionHeader
            eyebrow={<Eyebrow>{t('landing.featured.eyebrow')}</Eyebrow>}
            title={
              <Trans
                i18nKey="landing.featured.title"
                components={{ accent: <span className="text-luxe" /> }}
              />
            }
            subtitle={t('landing.featured.subtitle')}
            trailing={
              <Link
                to="/events"
                className="lg-btn lg-btn--ghost"
                style={{ padding: '0.7rem 1.3rem', fontSize: '0.85rem' }}
              >
                {t('landing.featured.browseAll')}
                <ArrowRight className="h-4 w-4 lg-arrow-flip" />
              </Link>
            }
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredEvents.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="lg-card h-full animate-pulse"
                  style={{ aspectRatio: '4 / 5' }}
                />
              ))
            : featuredEvents.map((event, i) => (
                <ScrollFadeRise key={event.id} delay={i * 60}>
                  <EventCard event={event} />
                </ScrollFadeRise>
              ))}
        </div>
      </Section>

      {/* ============================================================
          AI FEATURES ??? premium grid
          ============================================================ */}
      <Section>
        <Reveal>
          <SectionHeader
            eyebrow={<Eyebrow>{t('landing.ai.eyebrow')}</Eyebrow>}
            title={
              <Trans
                i18nKey="landing.ai.title"
                components={{ accent: <span className="text-luxe" /> }}
              />
            }
            subtitle={t('landing.ai.subtitle')}
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {[
            {
              Icon: ShieldCheck,
              titleKey: 'landing.ai.faceId.title',
              descKey: 'landing.ai.faceId.desc',
              grad: 'linear-gradient(135deg,#a855f7,#3b82f6)',
            },
            {
              Icon: Users,
              titleKey: 'landing.ai.crowd.title',
              descKey: 'landing.ai.crowd.desc',
              grad: 'linear-gradient(135deg,#3b82f6,#22d3ee)',
            },
            {
              Icon: Sparkles,
              titleKey: 'landing.ai.recs.title',
              descKey: 'landing.ai.recs.desc',
              grad: 'linear-gradient(135deg,#f0c674,#c084fc)',
            },
          ].map((f, i) => (
            <ScrollFadeRise key={f.titleKey} delay={i * 80} className="lg-card group h-full p-7">
                <span
                  className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    background: f.grad,
                    boxShadow:
                      '0 1px 0 0 rgba(255,255,255,0.35) inset, 0 12px 32px -8px rgba(168,85,247,0.55)',
                  }}
                >
                  <f.Icon className="h-7 w-7 text-white" strokeWidth={2.1} />
                </span>
                <h3 className="text-xl font-semibold tracking-[-0.005em]">{t(f.titleKey)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(f.descKey)}</p>
                <div
                  className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/70"
                >
                  {t('landing.ai.learnMore')}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </ScrollFadeRise>
          ))}
        </div>
      </Section>

      {/* ============================================================
          BIG STORYTELLING ??? split with image-style stack
          ============================================================ */}
      <Section>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <Pill tone="success" leadingIcon={<ShieldCheck className="h-3.5 w-3.5" />}>
              {t('landing.resale.pill')}
            </Pill>
            <h2 className="display-2 mt-5 text-balance">
              <Trans
                i18nKey="landing.resale.title"
                components={{ accent: <span className="text-luxe" />, br: <br /> }}
              />
            </h2>
            <p className="mt-5 max-w-md text-base text-muted-foreground">
              {t('landing.resale.subtitle')}
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                t('landing.resale.points.chain'),
                t('landing.resale.points.ai'),
                t('landing.resale.points.instant'),
              ].map((point) => (
                <li key={point} className="flex items-center gap-3">
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full"
                    style={{
                      background: 'rgba(52,211,153,0.18)',
                      color: '#6ee7b7',
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <Magnetic strength={6}>
              <Link to="/white-market" className="lg-btn mt-9 inline-flex">
                {t('landing.resale.browse')}
                <ArrowRight className="h-4 w-4 lg-arrow-flip" />
              </Link>
            </Magnetic>
          </Reveal>

          <Reveal delay={120}>
            <LandingResaleSpotlight />
          </Reveal>
        </div>
      </Section>

      {/* TESTIMONIALS ? premium quote cards */}
      <Section>
        <Reveal>
          <SectionHeader
            align="center"
            eyebrow={<Eyebrow>{t('landing.testimonials.eyebrow')}</Eyebrow>}
            title={
              <Trans
                i18nKey="landing.testimonials.title"
                components={{ accent: <span className="text-luxe" /> }}
              />
            }
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {(['q1', 'q2', 'q3'] as const).map((qKey, i) => {
            const quote = t(`landing.testimonials.${qKey}.quote`);
            const author = t(`landing.testimonials.${qKey}.author`);
            const role = t(`landing.testimonials.${qKey}.role`);
            return (
              <Reveal key={qKey} delay={i * 80}>
                <div className="lg-card h-full p-7">
                  <Quote className="h-7 w-7 text-[#c084fc]" />
                  <p className="mt-4 text-base leading-relaxed">{quote}</p>
                  <div className="mt-6 flex items-center gap-3">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{
                        background: 'linear-gradient(135deg,#a855f7,#3b82f6)',
                      }}
                    >
                      {author.slice(0, 1)}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{author}</div>
                      <div className="text-xs text-muted-foreground">{role}</div>
                    </div>
                    <div className="ms-auto inline-flex items-center gap-0.5 text-[#f0c674]">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ============================================================
          PREMIUM HOST CTA ??? luxe gold-edged card
          ============================================================ */}
      <Section>
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[2.5rem] border p-10 text-center md:p-16"
            style={{
              background:
                'radial-gradient(900px 400px at 0% 0%, rgba(168,85,247,0.32), transparent 60%), radial-gradient(900px 400px at 100% 100%, rgba(240,198,116,0.18), transparent 60%), rgba(8,9,18,0.7)',
              backdropFilter: 'blur(18px) saturate(1.7)',
              WebkitBackdropFilter: 'blur(18px) saturate(1.7)',
              borderColor: 'rgba(240,198,116,0.4)',
              boxShadow: 'var(--lg-shadow-luxe)',
            }}
          >
            <div aria-hidden className="mesh-noise" />
            <div className="relative">
              <div className="mx-auto mb-5 flex justify-center">
                <Pill tone="gold" leadingIcon={<Gem className="h-3.5 w-3.5" />}>
                  {t('landing.ctaPremium.pill')}
                </Pill>
              </div>
              <h2 className="display-1 text-balance">
                <Trans
                  i18nKey="landing.ctaPremium.title"
                  components={{ accent: <span className="text-gold" /> }}
                />
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
                {t('landing.ctaPremium.subtitle')}
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Magnetic strength={6}>
                  <Link to="/signup" className="lg-btn lg-btn--gold" style={{ padding: '1.05rem 1.9rem' }}>
                    {t('landing.ctaPremium.createAccount')}
                    <ArrowRight className="h-4 w-4 lg-arrow-flip" />
                  </Link>
                </Magnetic>
                <Magnetic strength={6}>
                  <Link to="/events" className="lg-btn lg-btn--ghost" style={{ padding: '1.05rem 1.9rem' }}>
                    {t('landing.ctaPremium.browseEvents')}
                  </Link>
                </Magnetic>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>
    </div>
  );
}
