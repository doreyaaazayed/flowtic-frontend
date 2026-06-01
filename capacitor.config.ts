import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Live reload on a physical phone (optional):
 *   set CAPACITOR_SERVER_URL=http://YOUR_PC_LAN_IP:5174
 *   then: npm run cap:sync
 * Backend must run on :5000; phone and PC on same Wi‑Fi.
 */
const devServer = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.flowtic.app',
  appName: 'FlowTic',
  webDir: 'dist',
  server: devServer
    ? {
        url: devServer,
        cleartext: true,
      }
    : {
        cleartext: true,
        androidScheme: 'https',
      },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#050614',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#050614',
    },
  },
};

export default config;
