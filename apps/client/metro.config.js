const fs = require("node:fs");
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// The single .env lives at the repo root; Expo only reads the app folder's. Only
// EXPO_PUBLIC_ values end up in the app.
const rootEnv = path.join(__dirname, "../../.env");
if (fs.existsSync(rootEnv)) process.loadEnvFile(rootEnv);

module.exports = withNativeWind(getDefaultConfig(__dirname), {
  input: "./src/global.css",
});
