const STORAGE_KEY = 'flowtic_create_event_megastar';

export type MegaStarDraft = {
  enabled: boolean;
  starId: string;
  durationId: string;
};

const empty: MegaStarDraft = { enabled: false, starId: '', durationId: '' };

export function loadMegaStarDraft(): MegaStarDraft {
  if (typeof window === 'undefined') return { ...empty };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...empty };
    const parsed = JSON.parse(raw) as Partial<MegaStarDraft>;
    return {
      enabled: Boolean(parsed.enabled),
      starId: typeof parsed.starId === 'string' ? parsed.starId : '',
      durationId: typeof parsed.durationId === 'string' ? parsed.durationId : '',
    };
  } catch {
    return { ...empty };
  }
}

export function saveMegaStarDraft(draft: MegaStarDraft): void {
  if (typeof window === 'undefined') return;
  if (!draft.enabled && !draft.starId && !draft.durationId) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearMegaStarDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
