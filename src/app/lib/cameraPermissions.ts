/** Camera / mic APIs require a secure context (HTTPS or localhost). */
export function isSecureCameraContext(): boolean {
  if (typeof window === 'undefined') return true;
  return window.isSecureContext;
}

export function insecureCameraHint(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  const port = window.location.port || '5174';
  return `Camera needs HTTPS. On your phone open https://${host}:${port} (not http). On PC run: cd frontend && npm run dev:https — then accept the certificate warning once.`;
}

/** User-facing message when getUserMedia fails (grad demo / localhost). */
export function describeCameraError(err: unknown): string {
  if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
    if (!isSecureCameraContext()) {
      return insecureCameraHint();
    }
    return 'Camera is not available in this browser.';
  }

  const name = err instanceof DOMException ? err.name : '';
  const msg = err instanceof Error ? err.message : String(err ?? '');

  if (name === 'NotAllowedError' || /permission/i.test(msg)) {
    return 'Camera blocked. Allow camera for this site in browser settings, then reload. On phone, use Chrome/Safari over HTTPS or localhost.';
  }
  if (name === 'NotFoundError' || /not found/i.test(msg)) {
    return 'No camera found. Connect a webcam or use a device with a front camera.';
  }
  if (name === 'NotReadableError' || /in use/i.test(msg)) {
    return 'Camera is in use by another app. Close other apps (Zoom, Teams) and try again.';
  }
  if (name === 'SecurityError' || /secure/i.test(msg)) {
    return 'Camera needs a secure context. Open the app via https:// or http://localhost (not a raw IP on HTTP).';
  }
  return msg || 'Camera unavailable';
}
