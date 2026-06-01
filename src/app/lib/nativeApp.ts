import { Capacitor } from '@capacitor/core';

/** True inside the Capacitor Android / iOS shell (not mobile Safari). */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

/** Native app loading the Vite dev server (CAPACITOR_SERVER_URL live reload). */
export function isNativeDevServer(): boolean {
  return isNativeApp() && import.meta.env.DEV;
}
