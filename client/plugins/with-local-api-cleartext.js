const { withAndroidManifest } = require('@expo/config-plugins');

const LOCAL_HTTP_API =
  /^http:\/\/(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?(?:\/|$)/i;

module.exports = function withLocalApiCleartext(config) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
  if (!LOCAL_HTTP_API.test(apiUrl)) {
    return config;
  }

  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error(
        'Không tìm thấy application trong AndroidManifest để bật API HTTP nội bộ.',
      );
    }

    application.$['android:usesCleartextTraffic'] = 'true';
    return modConfig;
  });
};
