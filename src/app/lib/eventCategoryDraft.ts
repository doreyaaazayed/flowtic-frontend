const STORAGE_KEY = 'flowtic_create_event_category';

export type EventCategoryDraft = {
  categoryId: string;
  categoryName: string;
};

export function saveEventCategoryDraft(categoryId: string, categoryName: string): void {
  if (typeof window === 'undefined') return;
  if (!categoryId) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ categoryId, categoryName: categoryName || '' } satisfies EventCategoryDraft),
  );
}

export function loadEventCategoryDraft(): EventCategoryDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EventCategoryDraft;
    if (typeof parsed?.categoryId !== 'string') return null;
    return {
      categoryId: parsed.categoryId,
      categoryName: typeof parsed.categoryName === 'string' ? parsed.categoryName : '',
    };
  } catch {
    return null;
  }
}

export function clearEventCategoryDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
