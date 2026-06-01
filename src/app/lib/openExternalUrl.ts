import { Browser } from '@capacitor/browser';
import { isNativeApp } from './nativeApp';

/** Opens http(s) links in the system browser on native; new tab on web. */
export async function openExternalUrl(url: string): Promise<void> {
  const target = url.trim();
  if (!target) return;

  if (isNativeApp()) {
    await Browser.open({ url: target });
    return;
  }

  window.open(target, '_blank', 'noopener,noreferrer');
}
