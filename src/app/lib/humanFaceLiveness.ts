import type { FaceResult } from '@vladmandic/human';
import { detectFaceFromVideo, getFaceHuman } from './humanFace';
import { isLikelyMobileDevice } from './deviceHints';

/** MediaPipe-style indices on 468-point face mesh. */
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

type XY = { x: number; y: number };

/** Human v3 returns mesh as Point[]; older samples may use flat number[]. */
function readMeshPoint(mesh: unknown[], index: number): XY | null {
  if (index < 0 || index >= mesh.length) return null;
  const p = mesh[index];
  if (Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number') {
    return { x: p[0], y: p[1] };
  }
  if (p && typeof p === 'object') {
    const o = p as { x?: number; y?: number };
    if (typeof o.x === 'number' && typeof o.y === 'number') return { x: o.x, y: o.y };
  }
  return null;
}

/** Flat [x,y,z, x,y,z, …] layout (legacy / tests). */
function readFlatMeshPoint(mesh: number[], index: number): XY | null {
  const i = index * 3;
  if (i + 1 >= mesh.length) return null;
  return { x: mesh[i], y: mesh[i + 1] };
}

function dist(a: XY, b: XY) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatioFromIndices(mesh: unknown[], indices: number[]): number | null {
  if (!mesh?.length || mesh.length <= Math.max(...indices)) return null;

  const isFlat = typeof mesh[0] === 'number' && mesh.length > indices.length * 2;
  const p = (idx: number) => (isFlat ? readFlatMeshPoint(mesh as number[], idx) : readMeshPoint(mesh, idx));
  const pts = indices.map((idx) => p(idx));
  if (pts.some((pt) => pt == null)) return null;

  const [p0, p1, p2, p3, p4, p5] = pts as XY[];
  const vertical = (dist(p1, p5) + dist(p2, p4)) / 2;
  const horizontal = dist(p0, p3);
  if (horizontal < 1e-6) return null;
  return vertical / horizontal;
}

function pointFromAnnotation(pt: number[] | undefined): XY | null {
  if (!pt || pt.length < 2) return null;
  return { x: pt[0], y: pt[1] };
}

function annPoint(a: FaceResult['annotations'], key: string): XY | null {
  const pts = a[key as keyof typeof a];
  if (!pts?.[0]) return null;
  return pointFromAnnotation(pts[0] as number[]);
}

/** Fallback when mesh indices are unavailable — uses Human annotation contours. */
function eyeAspectRatioFromAnnotations(face: FaceResult, side: 'left' | 'right'): number | null {
  const a = face.annotations;
  if (!a) return null;

  const upper1 = annPoint(a, `${side}EyeUpper1`);
  const upper2 = annPoint(a, `${side}EyeUpper2`);
  const lower1 = annPoint(a, `${side}EyeLower1`);
  const lower2 = annPoint(a, `${side}EyeLower2`);
  const upper0 = annPoint(a, `${side}EyeUpper0`);
  const lower0 = annPoint(a, `${side}EyeLower0`);

  const top = upper1 ?? upper2 ?? upper0;
  const bottom = lower1 ?? lower2 ?? lower0;
  const outer = annPoint(a, `${side}Eye`);
  const inner = side === 'left' ? annPoint(a, 'leftEyeLower3') : annPoint(a, 'rightEyeLower3');

  if (!top || !bottom) return null;

  const vertical = dist(top, bottom);
  let horizontal = outer && inner ? dist(outer, inner) : 0;
  if (horizontal < 1e-6 && upper0 && lower0) {
    horizontal = dist(upper0, lower0);
  }
  if (horizontal < 1e-6) return null;
  return vertical / horizontal;
}

export function eyeAspectRatio(mesh: unknown[], indices: number[]): number | null {
  return eyeAspectRatioFromIndices(mesh, indices);
}

export function combinedEar(face: FaceResult): number | null {
  const mesh = face.mesh as unknown[] | undefined;
  if (mesh?.length) {
    const left = eyeAspectRatioFromIndices(mesh, LEFT_EYE);
    const right = eyeAspectRatioFromIndices(mesh, RIGHT_EYE);
    if (left != null || right != null) {
      if (left == null) return right;
      if (right == null) return left;
      return (left + right) / 2;
    }
  }

  const leftAnn = eyeAspectRatioFromAnnotations(face, 'left');
  const rightAnn = eyeAspectRatioFromAnnotations(face, 'right');
  if (leftAnn == null && rightAnn == null) return null;
  if (leftAnn == null) return rightAnn;
  if (rightAnn == null) return leftAnn;
  return (leftAnn + rightAnn) / 2;
}

export type BlinkLivenessOpts = {
  maxMs?: number;
  /** After this many ms, skip blink (desktop webcam / glasses). */
  allowSkipAfterMs?: number;
  onStatus?: (message: string) => void;
};

type BlinkState = 'seek_face' | 'ready' | 'closed' | 'done';

function blinkThresholds() {
  const mobile = isLikelyMobileDevice();
  return {
    closedRatio: mobile ? 0.72 : 0.8,
    openRatio: mobile ? 0.86 : 0.82,
    minRelDrop: mobile ? 0.18 : 0.12,
    minAbsDrop: mobile ? 0.02 : 0.012,
    closedFramesNeeded: 1,
    openFramesNeeded: 1,
    framesToReady: mobile ? 3 : 2,
    pollMs: mobile ? 50 : 90,
  };
}

/**
 * Requires one natural blink before face capture (reduces static photo / screen spoofing).
 * On desktop, may auto-skip after allowSkipAfterMs when blink cannot be detected (glasses, slow GPU).
 */
export async function requireBlinkLiveness(
  video: HTMLVideoElement,
  opts: BlinkLivenessOpts = {},
): Promise<void> {
  const human = await getFaceHuman();
  const mobile = isLikelyMobileDevice();
  const th = blinkThresholds();
  const maxMs = opts.maxMs ?? (mobile ? 26_000 : 32_000);
  const allowSkipAfterMs = opts.allowSkipAfterMs ?? (mobile ? undefined : 11_000);
  const start = performance.now();

  let state: BlinkState = 'seek_face';
  let peakEar = 0;
  let recentEars: number[] = [];
  let closedStreak = 0;
  let openStreak = 0;
  let lastFaceAt = 0;
  let lastEarAt = 0;
  let slowDetectStreak = 0;

  opts.onStatus?.('Look at the camera — blink once when ready');

  while (performance.now() - start < maxMs) {
    const elapsed = performance.now() - start;

    if (
      allowSkipAfterMs != null &&
      elapsed >= allowSkipAfterMs &&
      state !== 'done'
    ) {
      opts.onStatus?.('Continuing — scan your face now');
      return;
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise((r) => setTimeout(r, th.pollMs));
      continue;
    }

    const face = await detectFaceFromVideo(human, video, mobile ? 10_000 : 8_000);
    let ear: number | null = null;
    if (face) {
      lastFaceAt = performance.now();
      ear = combinedEar(face);
      if (ear != null && ear > 0.03) lastEarAt = performance.now();
      slowDetectStreak = 0;
    } else {
      slowDetectStreak += 1;
      if (slowDetectStreak >= 8 && elapsed > 4000) {
        opts.onStatus?.('Detection is slow — hold still, we are still working…');
      }
    }

    const now = performance.now();
    const noFaceMs = now - lastFaceAt;
    const noEarMs = now - lastEarAt;

    if (lastFaceAt === 0 || noFaceMs > 2800) {
      state = 'seek_face';
      peakEar = 0;
      recentEars = [];
      closedStreak = 0;
      openStreak = 0;
      opts.onStatus?.('Center your face in the frame — good lighting helps');
    } else if (ear == null && noEarMs > 3000) {
      opts.onStatus?.('Keep eyes visible (glasses are OK) — then blink once');
    } else if (ear != null) {
      recentEars.push(ear);
      if (recentEars.length > 20) recentEars.shift();
      peakEar = Math.max(peakEar, ...recentEars);

      if (state === 'seek_face' && recentEars.length >= th.framesToReady) {
        state = 'ready';
        opts.onStatus?.('Blink once naturally');
      }

      if (state === 'ready' || state === 'closed') {
        const drop = peakEar - ear;
        const relDrop = peakEar > 0 ? drop / peakEar : 0;
        const isClosed =
          peakEar > 0.06 &&
          (ear < peakEar * th.closedRatio || relDrop >= th.minRelDrop) &&
          drop >= th.minAbsDrop;

        if (state === 'ready') {
          if (isClosed) {
            closedStreak += 1;
            if (closedStreak >= th.closedFramesNeeded) {
              state = 'closed';
              openStreak = 0;
              opts.onStatus?.('Good — open your eyes');
            }
          } else {
            closedStreak = 0;
            opts.onStatus?.('Blink once naturally');
          }
        } else if (state === 'closed') {
          const isOpen = ear >= peakEar * th.openRatio || relDrop < th.minRelDrop * 0.5;
          if (isOpen) {
            openStreak += 1;
            if (openStreak >= th.openFramesNeeded) {
              state = 'done';
              break;
            }
          } else {
            openStreak = 0;
          }
        }
      }
    }

    await new Promise((r) => setTimeout(r, th.pollMs));
  }

  if (state !== 'done') {
    if (allowSkipAfterMs != null) {
      opts.onStatus?.('Continuing — scan your face now');
      return;
    }
    throw new Error(
      mobile
        ? 'Blink not detected. Face the camera in bright, even light, then blink once slowly.'
        : 'Blink not detected. Try removing glasses briefly, use brighter light, or wait — we will continue automatically.',
    );
  }
}
