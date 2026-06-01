import { useState, useCallback, useEffect } from "react";
import type { NavigateFunction } from "react-router-dom";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { profile as profileApi, getToken, type AuthUser } from "../lib/api";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogAction,
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { buttonVariants } from "./ui/button";
import { cn } from "./ui/utils";
import "../../styles/saved-cards-wallet.css";

export type SavedCardRow = {
  _id: string;
  lastFour: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName?: string;
  label?: string;
};

const MAX_CARDS = 4;

function formatBrandShort(brand: string): string {
  switch ((brand || "").toLowerCase()) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "amex":
      return "Amex";
    case "discover":
      return "Discover";
    default:
      return brand ? `${brand.slice(0, 1).toUpperCase()}${brand.slice(1)}` : "Card";
  }
}

function formatPanInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function parseExpiryCombined(combined: string): { month: number; year: number } | null {
  const digits = combined.replace(/\D/g, "");
  if (digits.length < 4) return null;
  const month = Number(digits.slice(0, 2));
  let year = Number(digits.slice(2, 4));
  if (month < 1 || month > 12) return null;
  year += 2000;
  return { month, year };
}

function NetRow({ brand }: { brand: string }) {
  const b = (brand || "").toLowerCase();
  return (
    <div className="sc-net-row">
      <span className={`sc-net-visa ${b === "visa" ? "sc-net--on" : ""}`}>VISA</span>
      <span className={`sc-net-mc ${b === "mastercard" ? "sc-net--on" : ""}`} aria-hidden="true">
        <span />
        <span />
      </span>
      <span className={`sc-net-meeza ${b === "meeza" ? "sc-net--on" : ""}`}>MEEZA</span>
    </div>
  );
}

export type DashboardTabId = "tickets" | "orders" | "loyalty" | "cards" | "profile";

export function SavedCardsWalletTab({
  savedCards,
  authUser,
  navigate,
  onCardsRefresh,
}: {
  savedCards: SavedCardRow[];
  authUser: AuthUser | null;
  navigate: NavigateFunction;
  onCardsRefresh: () => Promise<void>;
  onLeaveToTab?: (tab: DashboardTabId) => void;
}) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [cardNumberInput, setCardNumberInput] = useState("");
  const [expiryCombined, setExpiryCombined] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardLabel, setCardLabel] = useState("");
  const [cardSaving, setCardSaving] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const openModal = useCallback(() => {
    if (savedCards.length >= MAX_CARDS) {
      setCardError(t("dashboard.savedCards.maxCards", { max: MAX_CARDS }));
      return;
    }
    setCardError(null);
    setCardNumberInput("");
    setExpiryCombined("");
    setCardHolderName("");
    setCardLabel("");
    setModalOpen(true);
  }, [savedCards.length, t]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setCardError(null);
  }, []);

  useEffect(() => {
    if (savedCards.length < MAX_CARDS) {
      setCardError((prev) => (prev?.includes(String(MAX_CARDS)) ? null : prev));
    }
  }, [savedCards.length]);

  const holderForCard = (c: SavedCardRow) =>
    (c.cardholderName && c.cardholderName.trim()) ||
    [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ") ||
    authUser?.username ||
    "Cardholder";

  const saveCard = async () => {
    if (!getToken()) {
      setCardError(t("dashboard.savedCards.signInRequired"));
      navigate("/signin", { state: { from: "/dashboard" } });
      return;
    }
    setCardError(null);
    const digits = cardNumberInput.replace(/\D/g, "");
    const parsed = parseExpiryCombined(expiryCombined);
    if (digits.length < 13 || digits.length > 19) {
      setCardError(t("dashboard.savedCards.invalidNumber"));
      return;
    }
    if (!parsed) {
      setCardError(t("dashboard.savedCards.invalidExpiry"));
      return;
    }
    const { month, year } = parsed;
    if (!year || year < 2000) {
      setCardError(t("dashboard.savedCards.invalidExpiry"));
      return;
    }
    setCardSaving(true);
    try {
      await profileApi.cards.add({
        cardNumber: String(digits),
        expiryMonth: month,
        expiryYear: year,
        ...(cardHolderName.trim() && { cardholderName: cardHolderName.trim() }),
        ...(cardLabel.trim() && { label: cardLabel.trim() }),
      });
      setCardNumberInput("");
      setExpiryCombined("");
      setCardHolderName("");
      setCardLabel("");
      await onCardsRefresh();
      closeModal();
    } catch (e) {
      setCardError(e instanceof Error ? e.message : t("dashboard.savedCards.saveError"));
    } finally {
      setCardSaving(false);
    }
  };

  const onExpiryInput = (v: string) => {
    const digits = v.replace(/\D/g, "");
    let out = "";
    if (digits.length <= 2) out = digits;
    else out = `${digits.slice(0, 2)} / ${digits.slice(2, 4)}`;
    setExpiryCombined(out.slice(0, 7));
  };

  const atMax = savedCards.length >= MAX_CARDS;

  return (
    <div className="ft-saved-cards-scope space-y-6">
      <div className="cosmic-panel rounded-2xl border border-border p-5 sm:p-6 md:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary mb-2">
              <CreditCard className="h-5 w-5 shrink-0" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("dashboard.tabs.cards")}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
              {t("dashboard.savedCards.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {t("dashboard.savedCards.lede", { max: MAX_CARDS })}
            </p>
          </div>
          <Button
            type="button"
            className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-md shadow-primary/20"
            onClick={openModal}
            disabled={atMax}
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden />
            {t("dashboard.savedCards.addNew")}
          </Button>
        </header>

        {cardError && !modalOpen ? (
          <p
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {cardError}
          </p>
        ) : null}

        <div className="sc-grid" aria-live="polite">
          {savedCards.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 sm:py-14 text-center">
              <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" aria-hidden />
              <p className="text-sm text-muted-foreground m-0 mb-4 max-w-sm mx-auto">
                {t("dashboard.savedCards.empty")}
              </p>
              <Button
                type="button"
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary text-primary-foreground"
                onClick={openModal}
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden />
                {t("dashboard.savedCards.addNew")}
              </Button>
            </div>
          ) : (
            savedCards.map((c, idx) => {
              const thru = `${String(c.expiryMonth).padStart(2, "0")}/${String(c.expiryYear).slice(-2)}`;
              const variant = idx % 4;
              return (
                <article key={c._id} className={`sc-card sc-card--${variant}`}>
                  <div className="sc-card-top">
                    <div className="sc-card-chip" aria-hidden />
                    <div className="sc-card-bank">
                      FlowTic
                      <br />
                      {c.label?.trim() || formatBrandShort(c.brand)}
                    </div>
                  </div>
                  <div className="sc-card-pan">
                    <span className="opacity-90">···· ···· ····</span> {c.lastFour}
                  </div>
                  <div className="sc-card-bottom">
                    <div className="sc-card-holder">
                      <div className="sc-card-name">{holderForCard(c)}</div>
                      <div className="sc-card-exp-line">
                        {t("dashboard.savedCards.validThru", { date: thru })}
                      </div>
                    </div>
                    <div className="sc-card-network">
                      <NetRow brand={c.brand} />
                    </div>
                  </div>
                  <div className="sc-card-actions">
                    <button type="button" className="sc-use" onClick={() => navigate("/events")}>
                      {t("dashboard.savedCards.browseEvents")}
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="sc-icon-del text-current"
                          aria-label={t("dashboard.savedCards.remove")}
                        >
                          <Trash2 width={18} height={18} strokeWidth={2} className="mx-auto" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[min(100vw-2rem,28rem)]">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("dashboard.savedCards.removeTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("dashboard.savedCards.removeDesc", { lastFour: c.lastFour })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto">{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            className={cn(buttonVariants({ variant: "destructive" }), "w-full sm:w-auto")}
                            onClick={async () => {
                              await profileApi.cards.remove(c._id);
                              await onCardsRefresh();
                            }}
                          >
                            {t("dashboard.savedCards.remove")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full max-h-[min(92vh,640px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dashboard.savedCards.modalTitle")}</DialogTitle>
            <DialogDescription>{t("dashboard.savedCards.modalDesc")}</DialogDescription>
          </DialogHeader>

          {cardError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {cardError}
            </p>
          ) : null}

          <div className="space-y-4">
            <div>
              <label htmlFor="ft-sc-card-number" className="text-sm font-medium text-foreground">
                {t("dashboard.savedCards.cardNumber")}
              </label>
              <input
                id="ft-sc-card-number"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="•••• •••• •••• ••••"
                className="input-cosmic mt-1.5 w-full"
                value={cardNumberInput}
                onChange={(e) => setCardNumberInput(formatPanInput(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="ft-sc-name" className="text-sm font-medium text-foreground">
                {t("dashboard.savedCards.nameOnCard")}
              </label>
              <input
                id="ft-sc-name"
                type="text"
                autoComplete="cc-name"
                placeholder={t("dashboard.savedCards.namePlaceholder")}
                className="input-cosmic mt-1.5 w-full"
                value={cardHolderName}
                onChange={(e) => setCardHolderName(e.target.value.slice(0, 120))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ft-sc-expiry" className="text-sm font-medium text-foreground">
                  {t("dashboard.savedCards.expiry")}
                </label>
                <input
                  id="ft-sc-expiry"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM / YY"
                  maxLength={7}
                  className="input-cosmic mt-1.5 w-full"
                  value={expiryCombined}
                  onChange={(e) => onExpiryInput(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ft-sc-label" className="text-sm font-medium text-foreground">
                  {t("dashboard.savedCards.nickname")}
                </label>
                <input
                  id="ft-sc-label"
                  type="text"
                  placeholder={t("dashboard.savedCards.nicknamePlaceholder")}
                  className="input-cosmic mt-1.5 w-full"
                  value={cardLabel}
                  onChange={(e) => setCardLabel(e.target.value.slice(0, 80))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("dashboard.savedCards.modalNote")}</p>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeModal}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary text-primary-foreground"
              onClick={() => void saveCard()}
              disabled={cardSaving}
            >
              {cardSaving ? t("dashboard.savedCards.saving") : t("dashboard.savedCards.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
