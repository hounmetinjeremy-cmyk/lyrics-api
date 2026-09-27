import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.hounmetinjeremy.lyricsfinder',
  appName: 'Lyrics Finder',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    allowNavigation: ['lyrics-api.hounmetinjeremy.workers.dev'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
    },
  },
}

export default config
