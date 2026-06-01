/** Payload encoded in entry QR codes (validated by POST/GET bookings/validate-code). */
export function bookingQrValue(bookingId: number): string {
  return `FLOWTIC-B-${bookingId}`;
}

export type GateQrParseResult =
  | { kind: "booking"; bookingId: number }
  | { kind: "ticketId"; ticketId: number };

/**
 * Decode text from a gate handheld scan into lookup fields.
 * Supports booking QR (`FLOWTIC-B-{id}`) and plain numeric ticket IDs.
 */
export function parseGateQrPayload(raw: string): GateQrParseResult | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = s.match(/^FLOWTIC-B-(\d+)$/i);
  if (m) {
    const bookingId = parseInt(m[1], 10);
    if (!Number.isFinite(bookingId) || bookingId <= 0) return null;
    return { kind: "booking", bookingId };
  }
  if (/^\d{1,15}$/.test(s)) {
    const ticketId = parseInt(s, 10);
    if (ticketId > 0) return { kind: "ticketId", ticketId };
  }
  return null;
}

export type BrandedTicketDownloadOptions = {
  /** Event title; falls back to a generic label if missing */
  eventName?: string | null;
  /** Numeric ticket IDs to print under the QR (friendly gate entry, resale, etc.) */
  ticketIds?: number[];
};

const CSS_WIDTH = 640;
/** Export at 2× for sharper QR and text */
const SCALE = 2;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Very subtle blueprint grid — reads as premium / product UI */
function drawAmbientGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const step = 32;
  for (let gx = 0; gx <= width; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }
  for (let gy = 0; gy <= height; gy += step) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }
  ctx.restore();
}

function fillTextWithGradientHorizontal(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  font: string,
) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const metrics = ctx.measureText(text);
  const w = metrics.width;
  const x0 = centerX - w / 2;
  const x1 = centerX + w / 2;
  const lg = ctx.createLinearGradient(x0, y, x1, y + 36);
  lg.addColorStop(0, '#6366f1');
  lg.addColorStop(0.45, '#8b5cf6');
  lg.addColorStop(1, '#d946ef');
  ctx.fillStyle = lg;
  ctx.fillText(text, centerX, y);
  ctx.restore();
}

function wrapEventTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const clean = (text || '').trim() || 'Your event ticket';
  const words = clean.split(/\s+/).filter(Boolean);
  const all: string[] = [];
  let cur = '';

  const pushWordTooLongAsEllipsisBlock = (w: string) => {
    let s = w;
    while (s.length > 0 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
    all.push(`${s}…`);
    cur = '';
  };

  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(trial).width <= maxWidth) {
      cur = trial;
      continue;
    }
    if (cur) {
      all.push(cur);
      cur = w;
    } else {
      pushWordTooLongAsEllipsisBlock(w);
    }
  }
  if (cur) all.push(cur);

  if (all.length <= maxLines) return all;

  const head = all.slice(0, maxLines - 1);
  const tailText = all.slice(maxLines - 1).join(' ');
  let last = tailText;
  while (last.length > 0 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
  head.push(`${last}…`);
  return head;
}

/** Modern floating ticket PNG: atmospheric background + glassy card hierarchy */
export function downloadBrandedBookingTicketPng(
  qrSourceCanvas: HTMLCanvasElement | null,
  bookingId: number,
  options?: BrandedTicketDownloadOptions,
): void {
  if (!qrSourceCanvas) return;

  const rawEventName = options?.eventName ?? 'Your event ticket';

  const outerPad = 48;
  const cardW = CSS_WIDTH - outerPad * 2;
  const cardR = 30;

  const innerTop = 44;
  const eyebrowGap = 10;
  const brandGapAfter = 12;
  const ruleH = 4;
  const ruleGapAfter = 34;
  const eventLabelGap = 10;
  const titleLineH = 26;
  const maxTitleLines = 3;
  const titleBlockH = maxTitleLines * titleLineH + 14;
  const titleAfterGap = 30;
  const scanLabelGap = 12;

  const qrTile = 256;
  const qrPad = 20;
  const qrBoxR = 20;
  const qrBlockH = qrTile + qrPad * 2;

  const ticketIds = (options?.ticketIds ?? []).filter((n) => Number.isFinite(n) && n > 0);
  const ticketIdLineH = ticketIds.length > 0 ? 22 : 0;
  const ticketIdLabelH = ticketIds.length > 0 ? 14 : 0;
  const ticketIdBlockH =
    ticketIds.length > 0 ? ticketIdLabelH + 8 + ticketIds.length * ticketIdLineH + 16 : 0;

  const afterQrGap = ticketIdBlockH > 0 ? 16 : 28;
  const pillH = 40;
  const bottomInner = 40;

  const innerStackH =
    innerTop +
    12 +
    eyebrowGap +
    34 +
    brandGapAfter +
    ruleH +
    ruleGapAfter +
    12 +
    eventLabelGap +
    titleBlockH +
    titleAfterGap +
    10 +
    scanLabelGap +
    qrBlockH +
    afterQrGap +
    ticketIdBlockH +
    (ticketIdBlockH > 0 ? 12 : 0) +
    pillH +
    bottomInner;

  const cardH = innerStackH;
  const CSS_HEIGHT = outerPad * 2 + cardH;

  const out = document.createElement('canvas');
  out.width = CSS_WIDTH * SCALE;
  out.height = Math.ceil(CSS_HEIGHT) * SCALE;
  const ctx = out.getContext('2d');
  if (!ctx) return;
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingQuality = 'high';

  /* —— Atmospheric background —— */
  const baseGrad = ctx.createLinearGradient(0, 0, CSS_WIDTH, CSS_HEIGHT);
  baseGrad.addColorStop(0, '#050508');
  baseGrad.addColorStop(0.35, '#0f0a14');
  baseGrad.addColorStop(1, '#0c1028');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, CSS_WIDTH, CSS_HEIGHT);

  const orb = (ox: number, oy: number, r: number, core: string) => {
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    g.addColorStop(0, core);
    g.addColorStop(1, 'rgba(5, 5, 8, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CSS_WIDTH, CSS_HEIGHT);
  };
  orb(CSS_WIDTH * 0.08, CSS_HEIGHT * 0.06, CSS_WIDTH * 0.72, 'rgba(99, 102, 241, 0.28)');
  orb(CSS_WIDTH * 0.92, CSS_HEIGHT * 0.12, CSS_WIDTH * 0.58, 'rgba(168, 85, 247, 0.22)');
  orb(CSS_WIDTH * 0.55, CSS_HEIGHT * 1.05, CSS_WIDTH * 0.95, 'rgba(59, 130, 246, 0.14)');

  drawAmbientGrid(ctx, CSS_WIDTH, CSS_HEIGHT);

  const cx = outerPad;
  const cy = outerPad;

  /* —— Card shadow passes (lifted floating panel) —— */
  ctx.save();
  roundedRect(ctx, cx + 2, cy + 6, cardW, cardH, cardR);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.filter = 'blur(18px)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 22;
  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, cx, cy, cardW, cardH, cardR);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = 1;
  roundedRect(ctx, cx, cy, cardW, cardH, cardR);
  ctx.stroke();

  ctx.save();
  const innerGlow = ctx.createLinearGradient(cx, cy, cx, cy + 120);
  innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  innerGlow.addColorStop(1, 'rgba(248, 250, 252, 0)');
  ctx.strokeStyle = innerGlow;
  ctx.lineWidth = 2;
  roundedRect(ctx, cx + 1, cy + 1, cardW - 2, cardH - 2, cardR - 1);
  ctx.stroke();
  ctx.restore();

  const centerX = cx + cardW / 2;

  let y = cy + innerTop;

  ctx.font = '600 10px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '0.24em';
  ctx.fillText('DIGITAL TICKET', centerX, y);
  ctx.letterSpacing = '0';

  y += 12 + eyebrowGap;
  fillTextWithGradientHorizontal(
    ctx,
    'FlowTic',
    centerX,
    y,
    '800 32px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
  );
  y += 34 + brandGapAfter;

  const ruleW = 148;
  const ruleGrad = ctx.createLinearGradient(centerX - ruleW / 2, y, centerX + ruleW / 2, y + ruleH);
  ruleGrad.addColorStop(0, 'transparent');
  ruleGrad.addColorStop(0.2, '#a78bfa');
  ruleGrad.addColorStop(0.5, '#c084fc');
  ruleGrad.addColorStop(0.8, '#e879f9');
  ruleGrad.addColorStop(1, 'transparent');
  roundedRect(ctx, centerX - ruleW / 2, y, ruleW, ruleH, 2);
  ctx.fillStyle = ruleGrad;
  ctx.fill();

  y += ruleH + ruleGapAfter;

  ctx.font = '700 10px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.letterSpacing = '0.18em';
  ctx.fillText('EVENT', centerX, y);
  ctx.letterSpacing = '0';

  y += 12 + eventLabelGap;

  ctx.font = '600 19px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const bodyMaxW = cardW - 80;
  const titleLines = wrapEventTitle(ctx, rawEventName, bodyMaxW, maxTitleLines);
  const usedTitleLines = Math.min(titleLines.length, maxTitleLines);
  const titleStartY = y;
  for (let i = 0; i < usedTitleLines; i++) {
    ctx.fillText(titleLines[i], centerX, titleStartY + i * titleLineH);
  }
  y = titleStartY + Math.max(usedTitleLines, 1) * titleLineH + titleAfterGap;

  ctx.font = '600 9px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.letterSpacing = '0.2em';
  ctx.fillText('SCAN AT ENTRY', centerX, y);
  ctx.letterSpacing = '0';

  y += 10 + scanLabelGap;

  const qrBoxW = qrTile + qrPad * 2;
  const qrBoxX = cx + (cardW - qrBoxW) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#fafafa';
  roundedRect(ctx, qrBoxX, y, qrBoxW, qrBlockH, qrBoxR);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.95)';
  ctx.lineWidth = 1;
  roundedRect(ctx, qrBoxX, y, qrBoxW, qrBlockH, qrBoxR);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
  ctx.lineWidth = 1;
  roundedRect(ctx, qrBoxX + 1, y + 1, qrBoxW - 2, qrBlockH - 2, qrBoxR - 1);
  ctx.stroke();

  const sw = qrSourceCanvas.width;
  const sh = qrSourceCanvas.height;
  const dx = qrBoxX + qrPad;
  const dy = y + qrPad;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(qrSourceCanvas, 0, 0, sw, sh, dx, dy, qrTile, qrTile);

  y += qrBlockH + afterQrGap;

  if (ticketIds.length > 0) {
    ctx.font = '700 9px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.letterSpacing = '0.16em';
    const idLabel = ticketIds.length === 1 ? 'TICKET ID' : 'TICKET IDS';
    ctx.fillText(idLabel, centerX, y);
    ctx.letterSpacing = '0';
    y += ticketIdLabelH + 8;

    ctx.font = '700 22px ui-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillStyle = '#0f172a';
    for (const tid of ticketIds) {
      ctx.fillText(String(tid), centerX, y);
      y += ticketIdLineH;
    }
    y += 16;
  }

  const pillText = `Booking #${bookingId}`;
  ctx.font = '600 14px ui-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  const tw = ctx.measureText(pillText).width;
  const pillW = tw + 44;
  const pillX = centerX - pillW / 2;
  const pillY = y;

  ctx.fillStyle = '#f1f5f9';
  roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(pillText, centerX, pillY + pillH / 2 + 0.5);

  const url = out.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `flowtic-ticket-${bookingId}.png`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
