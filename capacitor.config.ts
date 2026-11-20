import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.naivedya.app",
  appName: "Naivedya",
  webDir: "dist",
  android: {
    allowMixedContent: false
  },
  server: {
    androidScheme: "https"
  }
};

export default config;
