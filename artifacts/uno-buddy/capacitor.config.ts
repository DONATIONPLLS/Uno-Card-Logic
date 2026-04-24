import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.unobuddy.app",
  appName: "Uno Buddy",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
