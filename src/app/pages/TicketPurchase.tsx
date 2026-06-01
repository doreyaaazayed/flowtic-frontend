import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Check,
  Shield,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  events as eventsApi,
  venues as venuesApi,
  ticketCategories as ticketCategoriesApi,
  bookings as bookingsApi,
  seatMap as seatMapApi,
  seatHold as seatHoldApi,
  categories as categoriesApi,
  loyalty as loyaltyApi,
  profile,
} from "../lib/api";
import { CreditCardCheckoutForm } from "../components/food/CreditCardCheckoutForm";
import { resolveFoodCardPayment } from "../lib/foodPayment";
import { resolveEventVenueLabel } from "../lib/eventHosting";
import {
  validateCardForm,
  type CardFormValues,
} from "../lib/cardValidation";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { SeatMapInteractive } from "../components/seat-map/SeatMapInteractive";
import { useAuth } from "../context/AuthContext";
import { motion } from "motion/react";
import { Trans, useTranslation } from "react-i18next";
import {
  bookingQrValue,
  downloadBrandedBookingTicketPng,
} from "../lib/bookingQr";
import { TicketQrBlock } from "../components/booking/TicketQrBlock";

import { eventCardImageSrc } from "../lib/eventImage";

const SECTION_DOT_ONLY = [
  "bg-red-500",
  "bg-blue-950",
  "bg-amber-400",
  "bg-emerald-500",
  "bg-violet-600",
  "bg-rose-500",
];

function formatEventWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} | ${timePart}`;
}

function formatCountdown(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TicketPurchase() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const steps = useMemo(
    () => [
      { id: 1, name: t("ticket.steps.select") },
      { id: 2, name: t("ticket.steps.payment") },
      { id: 3, name: t("ticket.steps.faceId") },
      { id: 4, name: t("ticket.steps.confirmation") },
    ],
    [t],
  );

  const purchaserDisplayName = useMemo(() => {
    if (!user) return "";
    const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return full || user.username || user.email || "";
  }, [user]);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTickets, setSelectedTickets] = useState<{
    type: string;
    quantity: number;
    price: number;
    ticketCategoryId?: string;
  }>({ type: "", quantity: 1, price: 0, ticketCategoryId: "" });
  const [event, setEvent] = useState<{
    _id: string;
    Name: string;
    VenueID?: number;
    CategoryID?: number;
    StartDate?: string;
    isSeated?: boolean;
    imageUrl?: string;
    externalVenue?: { name?: string; location?: string; address?: string };
    hostingMode?: string;
    venueDetailsRevealed?: boolean;
  } | null>(null);
  const [venueLabel, setVenueLabel] = useState('—');
  const [eventCategoryLabel, setEventCategoryLabel] = useState("Event");
  const [ticketTypes, setTicketTypes] = useState<
    Array<{ _id: string; Name: string; Price: number; TotalQuantity: number }>
  >([]);
  const [seatMapData, setSeatMapData] = useState<{
    isSeated: boolean;
    floorPlanUrl?: string | null;
    stagePosition?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'none';
    sections: Array<{
      name: string;
      ticketCategoryId: string;
      ticketCategoryName: string;
      price: number;
      rows: Array<{
        label: string;
        seats: Array<{
          SeatID: number;
          SeatNumber: number;
          available: boolean;
          posX?: number;
          posY?: number;
        }>;
      }>;
    }>;
  } | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [sectionVisible, setSectionVisible] = useState<boolean[]>([]);
  const [holdTtl, setHoldTtl] = useState<number | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [holdError, setHoldError] = useState("");
  const holdEventIdRef = useRef<string | null>(null);
  const heldSeatIdsRef = useRef<number[]>([]);
  const [checkoutSeconds, setCheckoutSeconds] = useState(15 * 60);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const [requestUpgrade, setRequestUpgrade] = useState(false);
  const [lastPointsEarned, setLastPointsEarned] = useState(0);
  const [savedCards, setSavedCards] = useState<
    Array<{ _id: string; lastFour: string; brand: string }>
  >([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [paymentCardId, setPaymentCardId] = useState("");
  const [useNewCard, setUseNewCard] = useState(true);
  const [cardForm, setCardForm] = useState<CardFormValues>({
    cardholderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardFormValues, string>>>({});
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [bookingDone, setBookingDone] = useState(false);
  const [lastBookingId, setLastBookingId] = useState<number | null>(null);
  const [lastTicketIds, setLastTicketIds] = useState<number[]>([]);
  const confirmationQrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!id) return;
    if (!user) {
      navigate("/signin", { state: { from: `/purchase/${id}` } });
      return;
    }
    const ac = new AbortController();
    let cancelled = false;

    Promise.all([
      eventsApi.get(id, { signal: ac.signal }),
      ticketCategoriesApi.listByEvent(id),
      categoriesApi.list({ publicOnly: true }, { signal: ac.signal }),
      venuesApi.list({ signal: ac.signal }),
    ])
      .then(([ev, cats, allCats, venueRows]) => {
        if (cancelled) return;
        setEvent(ev);
        setVenueLabel(
          resolveEventVenueLabel(
            ev,
            venueRows as Array<{ VenueID: number; Name: string; Location?: string }>,
          ),
        );
        setTicketTypes(cats);
        if (ev.CategoryID != null && Array.isArray(allCats)) {
          const match = allCats.find((c) => c.CategoryID === ev.CategoryID);
          if (match?.Name) setEventCategoryLabel(match.Name);
        }
        if (ev.isSeated) {
          return seatMapApi.get(id).then((map) => {
            if (cancelled) return;
            setSeatMapData(map);
            return [ev, cats];
          });
        }
        if (cats.length > 0) {
          const first = cats[0];
          setSelectedTickets({
            type: first.Name,
            quantity: 1,
            price: first.Price,
            ticketCategoryId: first._id,
          });
        }
        return [ev, cats];
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        navigate("/events");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [id, user, navigate]);

  useEffect(() => {
    if (currentStep !== 2 || !user) return;
    let alive = true;
    setCardsLoading(true);
    profile.cards
      .list()
      .then((list) => {
        if (!alive) return;
        setSavedCards(list);
        setUseNewCard(list.length === 0);
        if (list.length > 0) {
          setPaymentCardId(list[0]._id);
        }
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        if (fullName) {
          setCardForm((prev) =>
            prev.cardholderName ? prev : { ...prev, cardholderName: fullName },
          );
        }
      })
      .catch(() => {
        if (alive) setSavedCards([]);
      })
      .finally(() => {
        if (alive) setCardsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [currentStep, user]);

  const handleNext = async () => {
    // Step 2 = Payment — confirm booking here (buyer from signed-in account)
    if (currentStep === 2) {
      const isSeated = event?.isSeated && selectedSeatIds.length > 0;
      if (event?.isSeated) {
        if (selectedSeatIds.length === 0) {
          setSubmitError("Please select at least one seat.");
          return;
        }
      } else {
        if (!id || !selectedTickets.ticketCategoryId) {
          setSubmitError("Please select a ticket type above.");
          return;
        }
      }
      setSubmitError("");
      try {
        await resolveFoodCardPayment({
          useNewCard,
          selectedCardId: paymentCardId,
          savedCards,
          form: cardForm,
          t,
        });
      } catch (payErr) {
        setSubmitError(payErr instanceof Error ? payErr.message : t("ticket.paymentFailed"));
        return;
      }
      try {
        const promo = appliedPromoCode || undefined;
        const res = isSeated
          ? await bookingsApi.create({
              eventId: id!,
              seatIds: selectedSeatIds,
              promoCode: promo,
            })
          : await bookingsApi.create({
              eventId: id!,
              ticketCategoryId: selectedTickets.ticketCategoryId,
              quantity: selectedTickets.quantity,
              promoCode: promo,
              requestUpgrade: requestUpgrade && canRequestUpgrade,
            });
        setLastBookingId(res.booking.BookingID);
        setLastTicketIds(Array.isArray(res.ticketIds) ? res.ticketIds : []);
        setLastPointsEarned(res.loyaltyPointsEarned ?? 0);
        setBookingDone(true);
        if (id) {
          Promise.all([eventsApi.get(id), venuesApi.list()])
            .then(([ev, venueRows]) => {
              setEvent(ev);
              setVenueLabel(
                resolveEventVenueLabel(
                  ev,
                  venueRows as Array<{ VenueID: number; Name: string; Location?: string }>,
                ),
              );
            })
            .catch(() => {});
        }
        setCurrentStep(4);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Booking failed");
        return;
      }
      return;
    }
    if (currentStep === 4) {
      navigate("/dashboard?tickets=1");
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const isSeatedEvent =
    event?.isSeated &&
    seatMapData?.isSeated &&
    (seatMapData.sections?.length ?? 0) > 0;

  /** Full reference checkout (filters + map and/or row list) for every seated event on step 1. */
  const seatedCheckoutLayout =
    currentStep === 1 && isSeatedEvent && Boolean(seatMapData);

  const seatSectionIndex = useMemo(() => {
    const m = new Map<number, number>();
    seatMapData?.sections?.forEach((sec, si) => {
      for (const row of sec.rows) {
        for (const s of row.seats) m.set(s.SeatID, si);
      }
    });
    return m;
  }, [seatMapData]);

  useEffect(() => {
    const n = seatMapData?.sections?.length ?? 0;
    if (n === 0) {
      setSectionVisible([]);
      return;
    }
    setSectionVisible((prev) => {
      if (prev.length === n) return prev;
      return Array.from({ length: n }, (_, i) => prev[i] ?? true);
    });
  }, [seatMapData?.sections?.length]);

  useEffect(() => {
    if (!seatedCheckoutLayout) return;
    const timer = setInterval(
      () => setCheckoutSeconds((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [seatedCheckoutLayout]);

  // Release all held seats when the component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      if (holdEventIdRef.current && heldSeatIdsRef.current.length > 0) {
        seatHoldApi
          .release(holdEventIdRef.current, heldSeatIdsRef.current)
          .catch(() => {});
      }
    };
  }, []);

  // Hold seats as soon as the user selects them; release deselected ones
  useEffect(() => {
    if (!id || !event?.isSeated || selectedSeatIds.length === 0) return;

    let cancelled = false;
    setIsHolding(true);
    setHoldError("");

    seatHoldApi
      .hold(id, selectedSeatIds)
      .then((res) => {
        if (cancelled) return;
        heldSeatIdsRef.current = selectedSeatIds;
        holdEventIdRef.current = id;
        setHoldTtl(res.ttlSeconds);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        const msg =
          err.message ||
          "Some seats are already taken. Please choose different seats.";
        setHoldError(msg);
        // Deselect the conflicting seats so the user can re-pick
        setSelectedSeatIds([]);
      })
      .finally(() => {
        if (!cancelled) setIsHolding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSeatIds.join(","), id, event?.isSeated]);

  // Countdown the hold TTL; refresh when user advances to payment step
  useEffect(() => {
    if (holdTtl === null || holdTtl <= 0) return;
    const timer = setInterval(() => {
      setHoldTtl((t) => (t !== null && t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [holdTtl !== null]);

  // Refresh hold TTL when user reaches payment step
  useEffect(() => {
    if (currentStep !== 2 || !id || heldSeatIdsRef.current.length === 0) return;
    seatHoldApi.refresh(id, heldSeatIdsRef.current).catch(() => {});
  }, [currentStep, id]);

  const totalPrice = isSeatedEvent
    ? (seatMapData?.sections ?? []).reduce((sum, sec) => {
        const selectedInSection = selectedSeatIds.filter((sid) =>
          sec.rows.some((r) => r.seats.some((s) => s.SeatID === sid)),
        ).length;
        return sum + sec.price * selectedInSection;
      }, 0)
    : selectedTickets.price * selectedTickets.quantity;

  const toggleSeat = (seatId: number, available: boolean) => {
    if (!available) return;
    const si = seatSectionIndex.get(seatId);
    if (si !== undefined && sectionVisible[si] === false) return;
    setSelectedSeatIds((prev) =>
      prev.includes(seatId)
        ? prev.filter((x) => x !== seatId)
        : [...prev, seatId],
    );
  };

  const toggleSectionVisibility = (index: number) => {
    const len = seatMapData?.sections?.length ?? 0;
    setSectionVisible((prev) => {
      const base =
        prev.length === len
          ? [...prev]
          : Array.from({ length: len }, (_, i) => prev[i] ?? true);
      base[index] = !base[index];
      if (!base[index]) {
        const drop = new Set<number>();
        const sec = seatMapData?.sections?.[index];
        if (sec) {
          for (const row of sec.rows) {
            for (const s of row.seats) drop.add(s.SeatID);
          }
        }
        setSelectedSeatIds((ids) => ids.filter((id) => !drop.has(id)));
      }
      return base;
    });
  };

  const serviceFee = 5.99;
  const subtotalBeforePromo = totalPrice + serviceFee;
  const grandTotal = Math.max(0, subtotalBeforePromo - promoDiscount);

  const canRequestUpgrade =
    !isSeatedEvent &&
    (user?.loyaltyTier === "gold" || user?.loyaltyTier === "platinum");

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code || !id) return;
    setPromoError("");
    try {
      const res = await loyaltyApi.validatePromo({
        code,
        eventId: id,
        subtotal: totalPrice + serviceFee,
      });
      setAppliedPromoCode(res.code);
      setPromoDiscount(res.discountAmount);
      setPromoError("");
    } catch (err) {
      setAppliedPromoCode(null);
      setPromoDiscount(0);
      setPromoError(
        err instanceof Error ? err.message : t("loyalty.promoInvalid"),
      );
    }
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (seatedCheckoutLayout && seatMapData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50/80 via-background to-muted/30 text-foreground">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-12">
          {submitError && (
            <div className="p-4 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm font-medium mb-4">
              {submitError}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-5 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to event
          </button>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 items-start">
            {/* Category tiers — reference: left filter card */}
            <aside className="xl:col-span-2 order-2 xl:order-1">
              <div className="rounded-2xl bg-card/95 border border-border/80 shadow-md p-4 xl:sticky xl:top-24 backdrop-blur-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {t("ticket.filterCats")}
                </p>
                <ul className="divide-y divide-border/60">
                  {seatMapData.sections.map((section, si) => {
                    const on = sectionVisible[si] !== false;
                    return (
                      <li key={`${section.name}-${si}`}>
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(si)}
                          className="w-full flex items-center gap-3 py-3.5 px-1 text-left rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <span
                            className={`h-3 w-3 rounded-full shrink-0 ring-2 ring-white shadow-sm ${SECTION_DOT_ONLY[si % SECTION_DOT_ONLY.length]}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">
                              {section.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              EGP {section.price}
                            </div>
                          </div>
                          {on ? (
                            <Check
                              className="w-4 h-4 text-muted-foreground shrink-0"
                              aria-hidden
                            />
                          ) : (
                            <span
                              className="w-4 h-4 rounded border-2 border-muted-foreground/30 shrink-0"
                              aria-hidden
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            {/* Center: interactive schematic + optional Gemini floor-plan overlay */}
            <div className="xl:col-span-7 order-1 xl:order-2 min-w-0 space-y-6">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-5 py-6 md:p-8 dark:bg-card dark:border-border">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-foreground tracking-tight mb-2">
                  {t("ticket.selectSeats")}
                </h2>
                <p className="text-sm text-slate-500 dark:text-muted-foreground mb-6">
                  {t("ticket.selectSeatsHint")}
                </p>
              </div>
              <SeatMapInteractive
                sections={seatMapData.sections}
                currency="EGP"
                floorPlanUrl={seatMapData.floorPlanUrl}
                stagePosition={seatMapData.stagePosition}
                sectionVisible={sectionVisible}
                selectedSeatIds={selectedSeatIds}
                defaultZoom={0.7}
                onToggleSeat={toggleSeat}
              />
            </div>

            {/* Event + accordion checkout — reference: right rail */}
            <aside className="xl:col-span-3 order-3 xl:sticky xl:top-24 space-y-6">
              <div>
                <Badge
                  variant="secondary"
                  className="mb-2 rounded-full px-3 py-0.5 text-xs font-medium"
                >
                  {eventCategoryLabel}
                </Badge>
                <h1 className="font-serif text-2xl sm:text-[1.65rem] font-bold leading-snug tracking-tight text-foreground">
                  {event.Name}
                </h1>
                {event.StartDate && (
                  <p className="text-sm text-muted-foreground mt-3">
                    {formatEventWhen(event.StartDate)}
                  </p>
                )}
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mt-2 tabular-nums">
                  {t("ticket.checkoutLeft", {
                    time: formatCountdown(checkoutSeconds),
                  })}
                </p>
                {holdError && (
                  <p className="mt-2 text-sm font-medium text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {holdError}
                  </p>
                )}
                {holdTtl !== null &&
                  holdTtl > 0 &&
                  selectedSeatIds.length > 0 && (
                    <p
                      className={`mt-2 text-xs font-semibold tabular-nums ${holdTtl < 60 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}
                    >
                      {isHolding
                        ? "Holding seats…"
                        : `Seats held for ${formatCountdown(holdTtl)}`}
                    </p>
                  )}
                {holdTtl === 0 && selectedSeatIds.length > 0 && (
                  <p className="mt-2 text-xs font-semibold text-destructive">
                    Hold expired — please re-select your seats.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="rounded-xl border-2 border-amber-400/90 bg-amber-50/60 dark:bg-amber-950/25 overflow-hidden">
                  <div className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-950 text-sm font-bold shadow-sm">
                      1
                    </span>
                    <span className="flex-1 font-semibold text-sm">
                      {t("ticket.selectTicket")}
                    </span>
                    <ChevronUp
                      className="w-4 h-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                  <div className="px-4 pb-4 ps-[3.25rem] text-sm text-muted-foreground border-t border-amber-200/50 dark:border-amber-900/40 pt-3">
                    {t("ticket.selectTicketHint")}{" "}
                    <span className="font-medium text-foreground">
                      {selectedSeatIds.length}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card/50 px-4 py-3.5 flex items-center gap-3 opacity-75">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-semibold">
                    2
                  </span>
                  <span className="flex-1 font-medium text-sm text-muted-foreground">
                    {t("ticket.addOns")}
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                </div>

                <div className="rounded-xl border border-border bg-card/50 px-4 py-3.5 flex items-center gap-3 opacity-75">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-semibold">
                    3
                  </span>
                  <span className="flex-1 font-medium text-sm text-muted-foreground">
                    {t("ticket.reviewCheckout")}
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card/80 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("ticket.tickets")}
                  </span>
                  <span className="font-medium tabular-nums">
                    EGP {totalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("ticket.serviceFee")}
                  </span>
                  <span className="font-medium tabular-nums">
                    EGP {serviceFee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="font-semibold">{t("ticket.total")}</span>
                  <span className="text-xl font-bold tabular-nums text-foreground">
                    EGP {grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleNext}
                disabled={
                  selectedSeatIds.length === 0 ||
                  isHolding ||
                  !!holdError ||
                  holdTtl === 0
                }
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-amber-950 shadow-md border-0"
              >
                {isHolding
                  ? "Securing seats…"
                  : `${t("ticket.continue")} (${selectedSeatIds.length} seat${selectedSeatIds.length !== 1 ? "s" : ""})`}
              </Button>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 lg-arrow-flip" />
          {t("ticket.backToEvent")}
        </button>

        <span className="lg-chip lg-chip--gold mb-4 inline-flex">
          <Sparkles className="h-3.5 w-3.5" /> {t("ticket.chip")}
        </span>
        <h1 className="display-2 text-balance">
          <Trans
            i18nKey="ticket.title"
            components={{ accent: <span className="text-luxe" /> }}
          />
        </h1>
        <p className="mt-3 mb-8 text-base text-muted-foreground sm:text-lg">
          {event.Name}
        </p>
        {submitError && (
          <div className="p-4 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive font-medium mb-4">
            {submitError}
            {submitError.includes("available") && (
              <p className="text-sm mt-2 opacity-90">
                {t("ticket.noTicketsSetup")}
              </p>
            )}
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      currentStep > step.id
                        ? "bg-primary text-white"
                        : currentStep === step.id
                          ? "bg-gradient-to-r from-primary to-secondary text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 text-center hidden sm:block ${
                      currentStep >= step.id
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded-full ${
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="cosmic-panel p-8"
            >
              {/* Step 1: Select Tickets (or Select Seats for seated events) */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">
                    {event?.isSeated
                      ? "Select Your Seats"
                      : "Select Your Tickets"}
                  </h2>
                  {event?.isSeated &&
                  !seatMapData?.sections?.length &&
                  seatMapData !== null ? (
                    <div className="p-6 rounded-xl bg-muted/50 text-center text-muted-foreground">
                      <p className="font-medium">
                        Seat map is not set up yet for this event.
                      </p>
                      <p className="text-sm mt-2">
                        Check back later or contact the organizer.
                      </p>
                    </div>
                  ) : ticketTypes.length === 0 ? (
                    <div className="p-6 rounded-xl bg-muted/50 text-center text-muted-foreground">
                      <p className="font-medium">
                        No ticket types available for this event yet.
                      </p>
                      <p className="text-sm mt-2">
                        Please try another event or check back later.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {ticketTypes.map((ticket) => (
                          <div
                            key={ticket._id}
                            onClick={() =>
                              setSelectedTickets({
                                type: ticket.Name,
                                quantity: 1,
                                price: ticket.Price,
                                ticketCategoryId: ticket._id,
                              })
                            }
                            className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                              selectedTickets.type === ticket.Name
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {ticket.Name}
                                </h3>
                                <p className="text-3xl font-bold text-primary">
                                  EGP {ticket.Price}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  {ticket.TotalQuantity} available
                                </p>
                              </div>
                            </div>
                            {ticket.Name.toLowerCase().includes("vip") && (
                              <ul className="text-sm text-muted-foreground space-y-1">
                                <li>✓ Priority entry</li>
                                <li>✓ Premium seating</li>
                                <li>✓ Exclusive lounge access</li>
                                <li>✓ Complimentary drinks</li>
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-6">
                        <label
                          htmlFor="purchase-quantity"
                          className="block text-sm font-medium mb-2"
                        >
                          Quantity
                        </label>
                        <Select
                          value={String(selectedTickets.quantity)}
                          onValueChange={(v) =>
                            setSelectedTickets({
                              ...selectedTickets,
                              quantity: Number(v),
                            })
                          }
                        >
                          <SelectTrigger id="purchase-quantity" className="w-full min-h-[48px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                              <SelectItem key={num} value={String(num)}>
                                {num} {num === 1 ? "ticket" : "tickets"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 2: Payment */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Payment Method</h2>
                  <div className="mb-6 rounded-xl border border-border/80 bg-muted/30 p-4 text-sm">
                    <p className="font-medium text-foreground">{t("ticket.purchasingAs")}</p>
                    <p className="mt-1 text-muted-foreground">{purchaserDisplayName}</p>
                    {user?.email ? (
                      <p className="text-muted-foreground">{user.email}</p>
                    ) : null}
                    {user?.phone ? (
                      <p className="text-muted-foreground">{user.phone}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("ticket.detailsFromAccount")}
                    </p>
                  </div>
                  <div className="space-y-4 mb-6">
                    <p className="text-sm text-muted-foreground">{t("ticket.paymentCardHint")}</p>
                    {cardsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t("ticket.loadingCards")}
                      </div>
                    ) : (
                      <CreditCardCheckoutForm
                        savedCards={savedCards}
                        selectedCardId={paymentCardId}
                        onSelectCard={setPaymentCardId}
                        values={cardForm}
                        onValuesChange={setCardForm}
                        useNewCard={useNewCard}
                        onUseNewCardChange={setUseNewCard}
                        errors={cardErrors}
                        onBlurValidate={() => setCardErrors(validateCardForm(cardForm, t))}
                      />
                    )}
                    {!cardsLoading && savedCards.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t("ticket.noSavedCards")}{" "}
                        <Link
                          to="/dashboard?cards=1"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {t("ticket.addCardInProfile")}
                        </Link>
                      </p>
                    )}
                    <div className="rounded-xl border border-border p-4 space-y-3">
                      <p className="text-sm font-medium">{t("ticket.promoCode")}</p>
                      <div className="flex gap-2">
                        <Input
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          placeholder="FLOW-XXXXXX"
                          className="font-mono"
                        />
                        <Button type="button" variant="outline" onClick={applyPromo}>
                          {t("ticket.applyCode")}
                        </Button>
                      </div>
                      {appliedPromoCode && (
                        <p className="text-sm text-emerald-500">
                          {t("loyalty.promoApplied")}: {appliedPromoCode} (−EGP{" "}
                          {promoDiscount.toFixed(2)})
                        </p>
                      )}
                      {promoError && (
                        <p className="text-sm text-destructive">{promoError}</p>
                      )}
                    </div>
                    {canRequestUpgrade && (
                      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
                        <Checkbox
                          id="loyalty-upgrade"
                          checked={requestUpgrade}
                          onCheckedChange={(v) => setRequestUpgrade(v === true)}
                        />
                        <Label htmlFor="loyalty-upgrade" className="text-sm cursor-pointer">
                          {t("loyalty.requestUpgrade")}
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Face ID Registration */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Register Face ID</h2>
                  <div className="text-center py-12">
                    <div className="w-48 h-48 mx-auto mb-6 rounded-full border-4 border-primary border-dashed flex items-center justify-center bg-primary/5">
                      <Shield className="w-24 h-24 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      Secure Entry with Face ID
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Register your face for quick and secure entry at the
                      event. This ensures only you can use your ticket.
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground max-w-md mx-auto mb-8">
                      <p>✓ Instant venue entry</p>
                      <p>✓ No physical ticket needed</p>
                      <p>✓ Prevent ticket fraud</p>
                    </div>
                    <Button
                      type="button"
                      className="bg-gradient-to-r from-primary to-secondary"
                      onClick={() =>
                        navigate("/face-id-registration", {
                          state: {
                            returnTo: id ? `/purchase/${id}` : "/events",
                          },
                        })
                      }
                    >
                      Enable Camera & Register
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === 4 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">
                    Payment Successful!
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Your tickets have been sent to your email and are available
                    in your dashboard.
                  </p>
                  {lastPointsEarned > 0 && (
                    <p className="text-sm text-primary mb-8">
                      {t("loyalty.earnOnBooking", { count: lastPointsEarned })}
                    </p>
                  )}

                  {/* QR Code */}
                  <div className="max-w-sm mx-auto mb-8">
                    <div className="bg-card border border-border rounded-xl p-6">
                      {lastBookingId != null ? (
                        <TicketQrBlock
                          ref={confirmationQrCanvasRef}
                          qrValue={bookingQrValue(lastBookingId)}
                          size={180}
                          ticketIds={lastTicketIds}
                          bookingId={lastBookingId}
                        />
                      ) : (
                        <div className="text-center text-muted-foreground text-sm py-8">
                          <p>QR code not available</p>
                          <p className="mt-2">
                            View My Tickets to see your ticket QR.
                          </p>
                        </div>
                      )}
                      {lastBookingId != null && (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 gap-2 w-full"
                          onClick={() =>
                            downloadBrandedBookingTicketPng(
                              confirmationQrCanvasRef.current,
                              lastBookingId,
                              {
                                eventName: event?.Name,
                                ticketIds: lastTicketIds,
                              },
                            )
                          }
                        >
                          <Download className="w-4 h-4" />
                          Download ticket (PNG)
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      className="bg-gradient-to-r from-primary to-secondary"
                      onClick={() => navigate("/dashboard?tickets=1")}
                    >
                      View My Tickets
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/event/${id}/food`)}>
                      {t('foodOrder.preOrderFood')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep < 4 && (
                <div className="flex gap-3 mt-8">
                  {currentStep > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    disabled={
                      (currentStep === 1 &&
                        (isSeatedEvent
                          ? selectedSeatIds.length === 0
                          : ticketTypes.length === 0)) ||
                      (currentStep === 2 && (bookingDone || cardsLoading))
                    }
                    className="flex-1 bg-gradient-to-r from-primary to-secondary"
                  >
                    {currentStep === 2 ? t("ticket.confirmPay") : t("ticket.continue")}
                  </Button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="cosmic-panel p-6 sticky top-24">
              <h3 className="font-semibold mb-4">Order Summary</h3>

              <div className="space-y-4 mb-6 pb-6 border-b border-border">
                <div className="flex gap-3">
                  <img
                    src={eventCardImageSrc(event.imageUrl)}
                    alt={event.Name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm line-clamp-2">
                      {event.Name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{venueLabel}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {isSeatedEvent ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {selectedSeatIds.length} seat(s) selected
                    </span>
                    <span className="font-medium">EGP {totalPrice}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {selectedTickets.type} Ticket x{selectedTickets.quantity}
                    </span>
                    <span className="font-medium">
                      EGP {selectedTickets.price * selectedTickets.quantity}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span className="font-medium">EGP 5.99</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-500">
                    <span>{t("loyalty.discount")}</span>
                    <span className="font-medium">−EGP {promoDiscount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    EGP {grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">
                  Secure checkout with 256-bit encryption
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
