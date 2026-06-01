import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Star,
  CheckCircle,
  Search,
  Clock,
  CreditCard,
  XCircle,
  ScanFace,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Trans, useTranslation } from 'react-i18next';
import { resale as resaleApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Reveal, Section, SectionHeader, Eyebrow, Pill } from '../liquid';
import { cn } from '../components/ui/utils';

type Listing = {
  _id: string;
  eventId?: { Name?: string; StartDate?: string };
  sellerId?: { Username?: string; Email?: string };
  price: number;
  status: string;
};

type EligibleTicket = {
  ticketId: number;
  eventId?: string;
  eventName: string;
  eventStartDate?: string;
  maxResalePrice?: number | null;
  originalPurchasePrice?: number | null;
};

type MyRequest = {
  _id: string;
  status: string;
  totalAmount?: number;
  platformFee?: number;
  listingId?: { price?: number; eventId?: { Name?: string; StartDate?: string } };
};

function statusLabel(status: string): {
  text: string;
  icon: React.ReactNode;
  tone: 'gold' | 'electric' | 'success' | 'danger' | 'default';
} {
  switch (status) {
    case 'Pending':
      return { text: 'Reserved (seller)', icon: <Clock className="h-3.5 w-3.5" />, tone: 'gold' };
    case 'PaymentPending':
      return {
        text: 'Awaiting payment',
        icon: <CreditCard className="h-3.5 w-3.5" />,
        tone: 'electric',
      };
    case 'Approved':
      return { text: 'Completed', icon: <CheckCircle className="h-3.5 w-3.5" />, tone: 'success' };
    case 'Rejected':
      return { text: 'Rejected', icon: <XCircle className="h-3.5 w-3.5" />, tone: 'danger' };
    default:
      return { text: status, icon: null, tone: 'default' };
  }
}

export function WhiteMarket() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const spotlightListingId = searchParams.get('listing');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [listModalOpen, setListModalOpen] = useState(false);
  const [eligibleTickets, setEligibleTickets] = useState<EligibleTicket[]>([]);
  const [listModalLoading, setListModalLoading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | ''>('');
  const [listPrice, setListPrice] = useState('');
  const [listError, setListError] = useState<string | null>(null);
  const [listSuccess, setListSuccess] = useState<string | null>(null);
  const [listSubmitting, setListSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const { user } = useAuth();

  const selectedTicket = useMemo(
    () =>
      selectedTicketId === ''
        ? null
        : eligibleTickets.find((t) => t.ticketId === selectedTicketId) ?? null,
    [eligibleTickets, selectedTicketId],
  );

  const maxResalePrice = useMemo(() => {
    const raw = selectedTicket?.maxResalePrice ?? selectedTicket?.originalPurchasePrice;
    if (raw == null || !Number.isFinite(Number(raw))) return null;
    return Number(raw);
  }, [selectedTicket]);

  useEffect(() => {
    if (!spotlightListingId || loading) return;
    const el = document.getElementById(`listing-${spotlightListingId}`);
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const next = new URLSearchParams(searchParams);
      next.delete('listing');
      setSearchParams(next, { replace: true });
    }, 400);
    return () => clearTimeout(t);
  }, [spotlightListingId, loading, listings, searchParams, setSearchParams]);

  const fetchListings = () => {
    setLoading(true);
    resaleApi
      .listings()
      .then(setListings)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchMyRequests = useCallback(() => {
    if (!user) return;
    setMyRequestsLoading(true);
    resaleApi
      .myRequests()
      .then(setMyRequests)
      .catch(() => setMyRequests([]))
      .finally(() => setMyRequestsLoading(false));
  }, [user]);

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return listings;
    const q = searchQuery.toLowerCase().trim();
    return listings.filter(
      (l) =>
        (l.eventId?.Name ?? '').toLowerCase().includes(q) ||
        (l.sellerId?.Username ?? '').toLowerCase().includes(q) ||
        (l.sellerId?.Email ?? '').toLowerCase().includes(q),
    );
  }, [listings, searchQuery]);

  const openListModal = () => {
    if (!user) return;
    setListModalOpen(true);
    setListError(null);
    setSelectedTicketId('');
    setListPrice('');
    setListModalLoading(true);
    resaleApi
      .eligibleTickets()
      .then(setEligibleTickets)
      .catch(() => setEligibleTickets([]))
      .finally(() => setListModalLoading(false));
  };

  const handleListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticketId = selectedTicketId === '' ? null : Number(selectedTicketId);
    const price = Number(listPrice);
    if (ticketId == null || Number.isNaN(price) || price < 0) {
      setListError(t('whiteMarket.list.invalidPrice'));
      return;
    }
    if (maxResalePrice != null && price > maxResalePrice) {
      setListError(
        t('whiteMarket.list.priceTooHigh', { max: maxResalePrice.toFixed(2) }),
      );
      return;
    }
    setListError(null);
    setListSubmitting(true);
    try {
      await resaleApi.list({ ticketId, price });
      setListModalOpen(false);
      setListError(null);
      setListSuccess('Your ticket is now listed on the White Market.');
      setTimeout(() => setListSuccess(null), 6000);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to list ticket.');
    } finally {
      setListSubmitting(false);
    }
  };

  const handleRequest = async (listingId: string) => {
    if (!user) return;
    setRequestingId(listingId);
    try {
      await resaleApi.request({ listingId });
      setListings((prev) => prev.filter((l) => l._id !== listingId));
      fetchMyRequests();
    } catch (_) {}
    setRequestingId(null);
  };

  return (
    <div className="relative">
      <Section tight>
        <Reveal>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Pill tone="success" leadingIcon={<ShieldCheck className="h-3.5 w-3.5" />}>
                {t('whiteMarket.pill')}
              </Pill>
              <h1 className="display-1 mt-4 text-balance">
                <Trans
                  i18nKey="whiteMarket.title"
                  components={{ accent: <span className="text-luxe" />, br: <br /> }}
                />
              </h1>
              <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
                {t('whiteMarket.subtitle')}
              </p>
            </div>
          </div>
        </Reveal>

        {listSuccess && (
          <div
            className="mt-6 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor: 'rgba(52,211,153,0.4)',
              background: 'rgba(52,211,153,0.08)',
              color: '#6ee7b7',
            }}
          >
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{listSuccess}</span>
          </div>
        )}

        {/* Trust grid */}
        <Reveal delay={120}>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                Icon: Shield,
                title: '100% verified sellers',
                desc: 'All sellers are ID-verified and payment-bonded.',
                grad: 'linear-gradient(135deg,#a855f7,#3b82f6)',
              },
              {
                Icon: ScanFace,
                title: 'Face ID secure transfer',
                desc: 'Tickets are instantly re-bonded to the new owner.',
                grad: 'linear-gradient(135deg,#3b82f6,#22d3ee)',
              },
              {
                Icon: ShieldCheck,
                title: 'Buyer protection',
                desc: 'Full refund if a ticket fails to scan at the gate.',
                grad: 'linear-gradient(135deg,#f0c674,#fb923c)',
              },
            ].map((b) => (
              <div key={b.title} className="lg-card p-5">
                <div className="flex items-start gap-3">
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background: b.grad,
                      boxShadow: '0 1px 0 0 rgba(255,255,255,0.35) inset',
                    }}
                  >
                    <b.Icon className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <h3 className="font-semibold tracking-[-0.005em]">{b.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Search */}
        <div className="mt-8">
          <div className="relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 z-[1] h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              id="white-market-search"
              name="market_search"
              type="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event or seller…"
              className="lg-input w-full !rounded-full !py-4 !pl-12 !pr-5 !text-base"
            />
          </div>
        </div>

        {/* My requests */}
        {user && (
          <div className="mt-12">
            <SectionHeader
              title="My buy requests"
              align="left"
              eyebrow={<Eyebrow>Status · Live</Eyebrow>}
              className="!mb-4"
            />
            {myRequestsLoading ? (
              <p className="py-4 text-sm text-muted-foreground">Loading your requests…</p>
            ) : myRequests.length === 0 ? (
              <p className="rounded-2xl border px-4 py-6 text-center text-sm text-muted-foreground"
                style={{ borderColor: 'var(--lg-border)', background: 'rgba(255,255,255,0.02)' }}>
                You have no active buy requests. When you tap “Request to Buy” on a listing,
                it appears here.
              </p>
            ) : (
              <div className="space-y-3">
                {myRequests.map((req) => {
                  const { text, icon, tone } = statusLabel(req.status);
                  const eventName = req.listingId?.eventId?.Name ?? 'Event';
                  const price = req.listingId?.price ?? 0;
                  return (
                    <div
                      key={req._id}
                      className="lg-card flex flex-wrap items-center justify-between gap-4 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{eventName}</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          EGP {Number(price).toFixed(2)}
                          {req.status === 'PaymentPending' && req.totalAmount != null && (
                            <span> → Total: EGP {Number(req.totalAmount).toFixed(2)}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Pill tone={tone} leadingIcon={icon as React.ReactNode}>
                          {text}
                        </Pill>
                        {req.status === 'PaymentPending' && (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/resale/payment/${req._id}`}>Pay now</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Listings */}
        <div className="mt-12">
          <SectionHeader
            title="Available listings"
            align="left"
            eyebrow={<Eyebrow>Live · Verified</Eyebrow>}
            className="!mb-6"
          />
          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="lg-card h-64 animate-pulse" />
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div
              className="rounded-3xl border p-12 text-center"
              style={{
                borderColor: 'var(--lg-border)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <Sparkles className="mx-auto h-10 w-10 text-[#c084fc]" />
              <h3 className="mt-4 text-lg font-semibold">No listings match your search</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different artist, venue or seller name.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredListings.map((listing, index) => (
                <Reveal key={listing._id} delay={index * 50}>
                  <div
                    id={`listing-${listing._id}`}
                    className={cn(
                      'lg-card group overflow-hidden transition-shadow',
                      spotlightListingId === listing._id && 'ring-2 ring-primary/60',
                    )}
                  >
                    <div
                      className="p-6"
                      style={{
                        borderBottom: '1px solid var(--lg-border)',
                      }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-1 text-lg font-semibold tracking-[-0.005em]">
                            {listing.eventId?.Name ?? 'Event'}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {listing.eventId?.StartDate
                              ? new Date(listing.eventId.StartDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '—'}
                          </p>
                        </div>
                        <Pill tone="success">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </Pill>
                      </div>
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantity</span>
                        <span className="font-medium">1 ticket</span>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Resale price
                        </p>
                        <p
                          className="mt-1 text-3xl font-extrabold tracking-[-0.02em]"
                          style={{
                            background: 'var(--grad-text)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          EGP {listing.price}
                        </p>
                      </div>

                      <div
                        className="mt-4 flex items-center justify-between pt-4"
                        style={{ borderTop: '1px solid var(--lg-border)' }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{
                              background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                            }}
                          >
                            {(listing.sellerId?.Username ?? 'S').charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {listing.sellerId?.Username ?? 'Seller'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[#f0c674]">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-medium">Verified</span>
                        </div>
                      </div>

                      <Button
                        className="mt-5 w-full bg-gradient-to-r from-primary to-secondary"
                        disabled={!user || requestingId === listing._id}
                        onClick={() => handleRequest(listing._id)}
                      >
                        {requestingId === listing._id ? 'Requesting…' : 'Request to buy'}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>

        {/* Sell CTA */}
        <Reveal>
          <div
            className="mt-16 overflow-hidden rounded-[2.5rem] border p-10 text-center md:p-14"
            style={{
              background:
                'radial-gradient(900px 400px at 0% 0%, rgba(168,85,247,0.32), transparent 60%), radial-gradient(900px 400px at 100% 100%, rgba(240,198,116,0.16), transparent 60%), rgba(8,9,18,0.7)',
              backdropFilter: 'blur(18px) saturate(1.7)',
              WebkitBackdropFilter: 'blur(18px) saturate(1.7)',
              borderColor: 'rgba(240,198,116,0.4)',
              boxShadow: 'var(--lg-shadow-luxe)',
            }}
          >
            <Pill tone="gold" leadingIcon={<Sparkles className="h-3.5 w-3.5" />}>
              Earn back · Sell safely
            </Pill>
            <h2 className="display-2 mt-5 text-balance">
              Have tickets to <span className="text-gold">sell?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
              List your tickets on the verified marketplace and reach thousands of buyers —
              safe, instant, refund-protected.
            </p>
            <button
              type="button"
              onClick={openListModal}
              disabled={!user}
              className="lg-btn lg-btn--gold mt-8 disabled:opacity-50"
              style={{ padding: '1rem 1.8rem' }}
            >
              List your tickets
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>

        {/* List modal */}
        <Dialog open={listModalOpen} onOpenChange={setListModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>List a ticket for resale</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleListSubmit} className="space-y-4">
              {listError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {listError}
                </div>
              )}
              {listModalLoading ? (
                <p className="text-sm text-muted-foreground">Loading your tickets…</p>
              ) : eligibleTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You have no tickets available to list, or all your tickets are already listed.
                </p>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="white-market-list-ticket"
                      className="mb-2 block text-sm font-medium"
                    >
                      Select ticket
                    </label>
                    <Select
                      value={selectedTicketId === '' ? undefined : String(selectedTicketId)}
                      onValueChange={(v) => setSelectedTicketId(Number(v))}
                    >
                      <SelectTrigger
                        id="white-market-list-ticket"
                        className="w-full min-h-[48px] h-auto py-3 text-start"
                      >
                        <SelectValue placeholder="Choose a ticket" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-w-[min(calc(100vw-2rem),32rem)]">
                        {eligibleTickets.map((t) => {
                          const cap = t.maxResalePrice ?? t.originalPurchasePrice;
                          const label = `${t.eventName}${
                            t.eventStartDate
                              ? ` – ${new Date(t.eventStartDate).toLocaleDateString()}`
                              : ''
                          } · Ticket #${t.ticketId}${
                            cap != null && Number.isFinite(Number(cap))
                              ? ` · paid EGP ${Number(cap).toFixed(2)}`
                              : ''
                          }`;
                          return (
                            <SelectItem
                              key={t.ticketId}
                              value={String(t.ticketId)}
                              className="whitespace-normal py-2.5 leading-snug"
                            >
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label
                      htmlFor="white-market-list-price"
                      className="mb-2 block text-sm font-medium"
                    >
                      {t('whiteMarket.list.priceLabel')}
                    </label>
                    {maxResalePrice != null && (
                      <p className="mb-2 text-xs text-muted-foreground">
                        {t('whiteMarket.list.priceCapHint', {
                          max: maxResalePrice.toFixed(2),
                        })}
                      </p>
                    )}
                    <input
                      id="white-market-list-price"
                      name="resale_price"
                      autoComplete="off"
                      type="number"
                      min={0}
                      max={maxResalePrice ?? undefined}
                      step={0.01}
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      placeholder={
                        maxResalePrice != null
                          ? t('whiteMarket.list.pricePlaceholderMax', {
                              max: maxResalePrice.toFixed(2),
                            })
                          : '0.00'
                      }
                      className="w-full rounded-lg border border-border px-4 py-3"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setListModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={listSubmitting || eligibleTickets.length === 0}>
                      {listSubmitting ? 'Listing…' : 'List ticket'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </Section>
    </div>
  );
}
