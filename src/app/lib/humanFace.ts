import Human from '@vladmandic/human';
import type { Config, FaceResult } from '@vladmandic/human';
import { isLikelyMobileDevice } from './deviceHints';

const HUMAN_VERSION = '3.3.6';
const CDN_JSdelivr = `https://cdn.jsdelivr.net/npm/@vladmandic/human@${HUMAN_VERSION}/models/`;
const CDN_UNPKG = `https://unpkg.com/@vladmandic/human@${HUMAN_VERSION}/models/`;

const LOAD_TIMEOUT_MS = 120_000;

/** Same-origin path — proxied to CDN in Vite dev; use public/models/human in production if synced. */
export function getLocalFaceModelBasePath(): string | null {
  if (typeof window === 'undefined') return null;
  const { protocol, hostname } = window.location;
  if (protocol === 'file:' || protocol === 'capacitor:') return null;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.')) {
    return `${window.location.origin}/models/human/`;
  }
  return null;
}

function getModelBaseCandidates(): string[] {
  const local = getLocalFaceModelBasePath();
  const bases = [local, CDN_JSdelivr, CDN_UNPKG].filter((b): b is string => Boolean(b));
  return [...new Set(bases)];
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

function buildFaceConfig(modelBasePath: string): Partial<Config> {
  const mobile = isLikelyMobileDevice();
  return {
    modelBasePath,
    debug: false,
    warmup: 'face',
    backend: 'webgl',
    filter: {
      enabled: true,
      flip: true,
      return: true,
    },
    body: { enabled: false },
    hand: { enabled: false },
    gesture: { enabled: false },
    object: { enabled: false },
    segmentation: { enabled: false },
    face: {
      enabled: true,
      detector: {
        maxDetected: 1,
        minConfidence: mobile ? 0.38 : 0.42,
        skipFrames: 0,
        skipTime: 0,
      },
      mesh: { enabled: true, skipFrames: mobile ? 0 : 1, skipTime: 0 },
      /** Iris is slow on desktop WebGL; blink uses mesh/annotations instead. */
      iris: { enabled: mobile, skipFrames: 0, skipTime: 0 },
      emotion: { enabled: false },
      attention: { enabled: false },
      description: {
        enabled: true,
        skipFrames: 0,
        skipTime: 0,
        minConfidence: mobile ? 0.38 : 0.42,
      },
      antispoof: { enabled: false },
      liveness: { enabled: false },
    },
  };
}

/** Face detector + mesh + faceres embedding only. */
export const humanFaceOnlyConfig: Partial<Config> = buildFaceConfig(CDN_JSdelivr);

let humanPromise: Promise<Human> | null = null;
let preloadPromise: Promise<Human> | null = null;

async function loadHumanFromBase(modelBasePath: string): Promise<Human> {
  const human = new Human(buildFaceConfig(modelBasePath));
  await withTimeout(
    human.load(),
    LOAD_TIMEOUT_MS,
    'Face models timed out. Check your network or try again in a moment.',
  );
  await withTimeout(
    human.warmup('face'),
    45_000,
    'Face engine warmup timed out. Try refreshing the page.',
  );
  return human;
}

async function loadHumanWithFallbacks(): Promise<Human> {
  const bases = getModelBaseCandidates();
  let lastError: unknown = new Error('No model sources configured');

  for (const base of bases) {
    try {
      return await loadHumanFromBase(base);
    } catch (err) {
      lastError = err;
      console.warn('[humanFace] model load failed for', base, err);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not load face recognition models. Check your connection and try again.');
}

export function resetFaceHumanCache() {
  humanPromise = null;
  preloadPromise = null;
}

/** Start loading models early (e.g. when opening Face ID sign-in). */
export function preloadFaceHuman(): Promise<Human> {
  if (!preloadPromise) {
    preloadPromise = getFaceHuman();
  }
  return preloadPromise;
}

export function getFaceHuman(): Promise<Human> {
  if (!humanPromise) {
    humanPromise = loadHumanWithFallbacks().catch((err) => {
      humanPromise = null;
      preloadPromise = null;
      throw err;
    });
  }
  return humanPromise;
}

const DETECT_TIMEOUT_MS = 12_000;

/** Prevent infinite hang when WebGL detect stalls (common on some desktop GPUs). */
export async function detectFaceFromVideo(
  human: Human,
  video: HTMLVideoElement,
  timeoutMs = DETECT_TIMEOUT_MS,
): Promise<FaceResult | null> {
  try {
    const result = await withTimeout(
      human.detect(video),
      timeoutMs,
      'Face detection timed out',
    );
    return result.face[0] ?? null;
  } catch (err) {
    console.warn('[humanFace] detect failed:', err);
    return null;
  }
}

export function averageL2Normalize(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null;
  const d = vectors[0].length;
  const sum = new Array(d).fill(0);
  for (const v of vectors) {
    if (v.length !== d) return null;
    for (let i = 0; i < d; i++) sum[i] += v[i];
  }
  const n = vectors.length;
  const avg = sum.map((x) => x / n);
  const norm = Math.sqrt(avg.reduce((s, x) => s + x * x, 0));
  if (norm < 1e-10) return null;
  return avg.map((x) => x / norm);
}

/** Higher score = clearer, well-framed face (used to drop bad frames). */
export function scoreFaceQuality(face: FaceResult, videoW: number, videoH: number): number {
  const box = face.box;
  const f = face as FaceResult & { faceScore?: number; boxScore?: number };
  const conf = f.faceScore ?? f.boxScore ?? face.confidence?.[0] ?? 0.5;
  if (!box || box.length < 4) return conf * 0.5;
  const bw = Math.abs(box[2] - box[0]);
  const bh = Math.abs(box[3] - box[1]);
  const areaRatio = (bw * bh) / Math.max(1, videoW * videoH);
  const sizeScore = areaRatio >= 0.04 && areaRatio <= 0.55 ? 1 : 0.55;
  const cx = (box[0] + box[2]) / 2;
  const cy = (box[1] + box[3]) / 2;
  const centered =
    Math.abs(cx - videoW / 2) < videoW * 0.22 && Math.abs(cy - videoH / 2) < videoH * 0.28 ? 1 : 0.7;
  return conf * sizeScore * centered;
}

export type CollectFaceOpts = {
  targetSamples?: number;
  maxMs?: number;
  minIntervalMs?: number;
  minQuality?: number;
  /** Run blink liveness check before sampling (recommended for enroll / sign-in). */
  requireBlink?: boolean;
  blinkMaxMs?: number;
  /** Desktop: continue without blink if still not detected after this many ms. */
  blinkAllowSkipAfterMs?: number;
  onProgress?: (samples: number, target: number, hint?: string) => void;
  onLivenessStatus?: (message: string) => void;
};

const ENROLLMENT_HINTS = [
  'Look straight at the camera',
  'Slowly turn your head slightly left',
  'Back to center — good lighting on your face',
  'Turn slightly right, then center again',
];

export async function collectFaceEmbeddingsFromVideo(
  video: HTMLVideoElement,
  opts: CollectFaceOpts = {},
): Promise<number[][]> {
  if (opts.requireBlink !== false) {
    const { requireBlinkLiveness } = await import('./humanFaceLiveness');
    await requireBlinkLiveness(video, {
      onStatus: opts.onLivenessStatus,
      maxMs: opts.blinkMaxMs,
      allowSkipAfterMs: opts.blinkAllowSkipAfterMs,
    });
  }

  const human = await getFaceHuman();
  const targetSamples = opts.targetSamples ?? 10;
  const maxMs = opts.maxMs ?? 38000;
  const minIntervalMs = opts.minIntervalMs ?? 220;
  const mobile = isLikelyMobileDevice();
  const minQuality = opts.minQuality ?? (mobile ? 0.42 : 0.38);
  const samples: number[][] = [];
  const start = performance.now();
  let lastSampleAt = 0;
  let hintIndex = 0;

  while (samples.length < targetSamples && performance.now() - start < maxMs) {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise((r) => setTimeout(r, 50));
      continue;
    }

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const face = await detectFaceFromVideo(human, video);
    const emb = face?.embedding;

    if (emb?.length && face) {
      const q = scoreFaceQuality(face, vw, vh);
      const now = performance.now();
      if (q >= minQuality && now - lastSampleAt >= minIntervalMs) {
        samples.push([...emb]);
        lastSampleAt = now;
        const hint = ENROLLMENT_HINTS[Math.min(hintIndex, ENROLLMENT_HINTS.length - 1)];
        opts.onProgress?.(samples.length, targetSamples, hint);
        if (samples.length % 3 === 0 && hintIndex < ENROLLMENT_HINTS.length - 1) {
          hintIndex += 1;
        }
      }
    }

    await new Promise((r) => setTimeout(r, 70));
  }

  opts.onProgress?.(samples.length, targetSamples);
  return samples;
}

/** Probe for verify/sign-in: average of several good frames (more stable than one shot). */
export async function collectFaceProbeFromVideo(
  video: HTMLVideoElement,
  opts: Omit<CollectFaceOpts, 'targetSamples'> & { targetSamples?: number } = {},
): Promise<number[] | null> {
  const samples = await collectFaceEmbeddingsFromVideo(video, {
    targetSamples: opts.targetSamples ?? 6,
    maxMs: opts.maxMs ?? 28000,
    minIntervalMs: opts.minIntervalMs ?? 180,
    minQuality: opts.minQuality ?? 0.45,
    requireBlink: opts.requireBlink !== false,
    onProgress: opts.onProgress,
    onLivenessStatus: opts.onLivenessStatus,
  });
  return averageL2Normalize(samples);
}
