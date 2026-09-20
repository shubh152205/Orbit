const { withAndroidManifest, withMainActivity, createRunOncePlugin } = require('@expo/config-plugins');

/**
 * Expo Config Plugin: withAndroidPiP
 * 
 * Configures Android for hardware-accelerated, system-level Picture-in-Picture (PiP)
 * and background media streaming:
 * 1. Configures MainActivity in AndroidManifest.xml with supportsPictureInPicture="true",
 *    resizeableActivity="true", and configuration change filters.
 * 2. Adds foreground service and wake lock permissions.
 * 3. Injects onUserLeaveHint() in MainActivity.kt to automatically trigger system PiP
 *    when the user navigates away or swipes to the home screen.
 */
function withAndroidPiP(config) {
  // 1. AndroidManifest modifications
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (mainApplication && mainApplication.activity) {
      const mainActivity = mainApplication.activity.find(
        (act) => act.$['android:name'] === '.MainActivity'
      );
      if (mainActivity) {
        mainActivity.$['android:supportsPictureInPicture'] = 'true';
        mainActivity.$['android:resizeableActivity'] = 'true';
        mainActivity.$['android:configChanges'] =
          'keyboard|keyboardHidden|orientation|screenSize|smallestScreenSize|screenLayout|uiMode';
      }
    }

    // Add necessary media & background permissions
    const permissionsToAdd = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.WAKE_LOCK',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ];

    if (!config.modResults.manifest['uses-permission']) {
      config.modResults.manifest['uses-permission'] = [];
    }

    const existingPermissions = new Set(
      config.modResults.manifest['uses-permission'].map((p) => p.$['android:name'])
    );

    for (const perm of permissionsToAdd) {
      if (!existingPermissions.has(perm)) {
        config.modResults.manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    return config;
  });

  // 2. MainActivity.kt modifications
  config = withMainActivity(config, (config) => {
    let src = config.modResults.contents;

    // Check if imports exist, otherwise inject them
    if (!src.includes('import android.app.PictureInPictureParams')) {
      const importBlock = `import android.app.PictureInPictureParams\nimport android.util.Rational\n`;
      src = src.replace('import android.os.Bundle', `import android.os.Bundle\n${importBlock}`);
    }

    // Inject onUserLeaveHint and onPictureInPictureModeChanged methods if not already present
    if (!src.includes('override fun onUserLeaveHint()')) {
      const pipMethods = `
  /**
   * System-level Picture-in-Picture trigger:
   * Called when the user presses Home or switches apps.
   */
  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      try {
        val aspectRatio = Rational(16, 9)
        val builder = PictureInPictureParams.Builder()
          .setAspectRatio(aspectRatio)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          builder.setAutoEnterEnabled(true)
        }
        enterPictureInPictureMode(builder.build())
      } catch (e: Exception) {
        // Fallback gracefully on devices where PiP is disabled by user or OEM
      }
    }
  }

  override fun onPictureInPictureModeChanged(
    isInPictureInPictureMode: Boolean,
    newConfig: android.content.res.Configuration
  ) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
  }
`;
      // Insert right before the last closing brace of MainActivity class
      const lastBraceIndex = src.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        src = src.slice(0, lastBraceIndex) + pipMethods + src.slice(lastBraceIndex);
      }
    }

    config.modResults.contents = src;
    return config;
  });

  return config;
}

module.exports = createRunOncePlugin(withAndroidPiP, 'withAndroidPiP', '1.0.0');
