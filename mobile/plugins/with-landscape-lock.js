const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

const RESTRICTED_RESIZABILITY_PROPERTY =
  "android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY";

const withLandscapeLock = (config) =>
  withAndroidManifest(config, (manifestConfig) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(
      manifestConfig.modResults,
    );
    mainActivity.$["android:screenOrientation"] = "sensorLandscape";

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      manifestConfig.modResults,
    );
    const properties = (application.property ?? []).filter(
      (property) => property.$["android:name"] !== RESTRICTED_RESIZABILITY_PROPERTY,
    );
    properties.push({
      $: {
        "android:name": RESTRICTED_RESIZABILITY_PROPERTY,
        "android:value": "true",
      },
    });
    application.property = properties;

    return manifestConfig;
  });

module.exports = withLandscapeLock;
