const appJson = require("./app.json");

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const isAutomatedBuild =
  process.env.EAS_BUILD === "true" || process.env.CI === "true";

const notificationsMode =
  process.env.EAS_BUILD_PROFILE === "production" ? "production" : "development";

if (isAutomatedBuild && !googleMapsApiKey) {
  throw new Error(
    "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Configure it as an EAS environment variable and as a GitHub Actions secret before building.",
  );
}

module.exports = () => {
  const base = appJson.expo;

  return {
    ...base,
    plugins: [
      ...(base.plugins || []),
      [
        "expo-notifications",
        {
          color: "#FFA70B",
          mode: notificationsMode,
        },
      ],
    ],
    ios: {
      ...base.ios,
      config: {
        ...(base.ios && base.ios.config),
        googleMapsApiKey,
      },
    },
    android: {
      ...base.android,
      config: {
        ...(base.android && base.android.config),
        googleMaps: {
          ...(base.android && base.android.config && base.android.config.googleMaps),
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
