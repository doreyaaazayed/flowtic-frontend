import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';

const NATIVE_APP_CALLBACK_BASE = "com.flowtic.app://auth/callback";

function navigateToOAuthCallback(rawUrl: string): void {
  let path = rawUrl;
  if (path.startsWith('com.flowtic.app://')) {
    path = path.slice('com.flowtic.app://'.length);
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  const callbackIdx = path.indexOf('/auth/callback');
  if (callbackIdx === -1) return;
  window.location.href = path.slice(callbackIdx);
}

/** Native shell setup (Android / iOS). No-op in browser. */
export async function initCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#050614' });
    }
  } catch {
    /* status bar optional */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* splash optional */
  }

  if (Capacitor.getPlatform() === 'ios') {
    try {
      Keyboard.setAccessoryBarVisible({ isVisible: true });
    } catch {
      /* optional */
    }
  }

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  App.addListener('appUrlOpen', (event) => {
    const url = event.url || '';
    if (url.includes('auth/callback')) {
      void Browser.close().catch(() => undefined);
      navigateToOAuthCallback(url);
    }
  });
}
