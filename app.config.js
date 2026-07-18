const appJson = require("./app.json");

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = () => {
  const base = appJson.expo;

  return {
    ...base,
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
