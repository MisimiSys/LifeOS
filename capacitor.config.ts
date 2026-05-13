import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.misimisys.lifeos',
  appName: 'LifeOS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
