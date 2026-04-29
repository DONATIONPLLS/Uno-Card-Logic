import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.unobuddy.app",
  appName: "Uno Buddy",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#000000",
  }
  // DELETED the plugins: { StatusBar: ... } block!
};

export default config;
