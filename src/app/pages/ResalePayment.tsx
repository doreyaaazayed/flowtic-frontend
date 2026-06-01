import { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, CheckCircle, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { resale as resaleApi } from '../lib/api';
import { Pill } from '../liquid/Pill';

type ResaleRequest = {
  _id: string;
  status: string;
  platformFee?: number;
  totalAmount?: number;
  listingId?: {
    price?: number;
    eventId?: { Name?: string };
  };
};

export function ResalePayment() {
  const { t } = useTranslation();
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<ResaleRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) {
      setError('Invalid payment link');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    resaleApi
      .getMyRequest(requestId)
      .then(setRequest)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [requestId]);

  const glassWrap = (children: React.ReactNode) => (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">{children}</div>
  );

  if (loading) {
    return glassWrap(
      <div className="lg-card p-10 text-center text-muted-foreground">Loading payment details…</div>,
    );
  }

  if (error || !request) {
    return glassWrap(
      <div className="lg-card p-10 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <p className="mb-4 text-muted-foreground">{error ?? 'Request not found'}</p>
        <Button asChild variant="outline">
          <Link to="/white-market">Back to white market</Link>
        </Button>
      </div>,
    );
  }

  if (request.status !== 'PaymentPending') {
    return glassWrap(
      <div className="lg-card p-10 text-center">
        <p className="mb-4 text-muted-foreground">
          This request is no longer awaiting payment.
          {request.status === 'Approved' && ' The ticket has been transferred to you.'}
          {request.status === 'Rejected' && ' The request was rejected.'}
        </p>
        <Button asChild variant="outline">
          <Link to="/white-market">Back to white market</Link>
        </Button>
      </div>,
    );
  }

  const ticketPrice = request.listingId?.price ?? 0;
  const platformFee = request.platformFee ?? 50;
  const total = request.totalAmount ?? ticketPrice + platformFee;
  const eventName = request.listingId?.eventId?.Name ?? 'Event';

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div
        className="relative overflow-hidden rounded-[2rem] border"
        style={{
          background: 'rgba(8,9,18,0.62)',
          backdropFilter: 'blur(18px) saturate(1.7)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.7)',
          borderColor: 'var(--lg-border-strong)',
          boxShadow: 'var(--lg-shadow)',
        }}
      >
        <div
          className="p-7"
          style={{
            background:
              'radial-gradient(500px 200px at 0% 0%, rgba(168,85,247,0.22), transparent 60%), radial-gradient(500px 200px at 100% 100%, rgba(59,130,246,0.18), transparent 60%)',
            borderBottom: '1px solid var(--lg-border)',
          }}
        >
          <Pill tone="electric" leadingIcon={<ShieldCheck className="h-3.5 w-3.5" />}>
            {t('resale.pill')}
          </Pill>
          <h1 className="display-3 mt-4 flex items-center gap-3 text-balance">
            <CreditCard className="h-7 w-7 text-[#c084fc]" />
            <span>
              <Trans
                i18nKey="resale.title"
                components={{ accent: <span className="text-luxe" /> }}
              />
            </span>
          </h1>
          <p className="mt-2 text-muted-foreground">{eventName}</p>
        </div>

        <div className="space-y-7 p-7">
          <div className="space-y-3 rounded-2xl border p-5"
            style={{ borderColor: 'var(--lg-border)', background: 'rgba(255,255,255,0.03)' }}>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ticket price</span>
              <span>EGP {ticketPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform fee</span>
              <span>EGP {platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-3 text-lg font-semibold"
              style={{ borderTop: '1px solid var(--lg-border)' }}>
              <span>Total to pay</span>
              <span
                style={{
                  background: 'var(--grad-text)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                EGP {total.toFixed(2)}
              </span>
            </div>
          </div>

          <div
            className="rounded-2xl border p-4 text-sm text-muted-foreground"
            style={{
              borderColor: 'rgba(59,130,246,0.4)',
              background: 'rgba(59,130,246,0.06)',
            }}
          >
            <p className="mb-2 font-semibold text-foreground">Payment instructions</p>
            <p>
              Pay the total above via your preferred method (bank transfer, payment link, or as
              agreed). When the payment clears, tap the button below to record the purchase and
              transfer the ticket to your account.
            </p>
          </div>

          {completeError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {completeError}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={completing}
              onClick={async () => {
                if (!requestId) return;
                setCompleteError(null);
                setCompleting(true);
                try {
                  await resaleApi.completeResalePurchase(requestId);
                  navigate('/dashboard?tickets=1');
                } catch (e) {
                  setCompleteError(e instanceof Error ? e.message : 'Could not complete purchase');
                } finally {
                  setCompleting(false);
                }
              }}
              className="lg-btn flex-1"
              style={{ padding: '0.85rem 1.3rem' }}
            >
              {completing ? 'Processing…' : 'I have paid — complete purchase'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <Button asChild variant="outline">
              <Link to="/dashboard">
                <CheckCircle className="mr-2 h-4 w-4" />
                My dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link to="/white-market" className="inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to white market
        </Link>
      </p>
    </div>
  );
}
