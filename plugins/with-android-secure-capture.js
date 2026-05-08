const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");

function addImport(source, importLine) {
  if (source.includes(importLine)) {
    return source;
  }

  return source.replace(
    "import expo.modules.splashscreen.SplashScreenManager\n",
    `import expo.modules.splashscreen.SplashScreenManager\n\n${importLine}\n`
  );
}

function ensureOnCreateCalls(source) {
  if (source.includes("blockAudioPlaybackCapture()\n    super.onCreate(null)")) {
    return source;
  }

  return source.replace(
    "    super.onCreate(null)",
    "    applySecureWindowFlags()\n    blockAudioPlaybackCapture()\n    super.onCreate(null)"
  );
}

function ensureOnResume(source) {
  if (!source.includes("override fun onResume()")) {
    return source.replace(
      "\n  /**\n   * Returns the name of the main component registered from JavaScript.",
      "\n  override fun onResume() {\n    super.onResume()\n    applySecureWindowFlags()\n    blockAudioPlaybackCapture()\n  }\n\n  /**\n   * Returns the name of the main component registered from JavaScript."
    );
  }

  if (/override fun onResume\(\) \{[\s\S]*?blockAudioPlaybackCapture\(\)[\s\S]*?\n  \}/.test(source)) {
    return source;
  }

  return source.replace(
    /override fun onResume\(\) \{\n\s*super\.onResume\(\)\n/,
    "override fun onResume() {\n    super.onResume()\n    applySecureWindowFlags()\n    blockAudioPlaybackCapture()\n"
  );
}

function ensureSecureMethods(source) {
  if (!source.includes("private fun applySecureWindowFlags()")) {
    source = source.replace(
      "\n  /**\n   * Returns the name of the main component registered from JavaScript.",
      "\n  private fun applySecureWindowFlags() {\n    window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)\n  }\n\n  /**\n   * Returns the name of the main component registered from JavaScript."
    );
  }

  if (!source.includes("private fun blockAudioPlaybackCapture()")) {
    source = source.replace(
      "\n  /**\n   * Returns the name of the main component registered from JavaScript.",
      "\n  private fun blockAudioPlaybackCapture() {\n    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {\n      getSystemService(AudioManager::class.java)\n        ?.setAllowedCapturePolicy(AudioAttributes.ALLOW_CAPTURE_BY_NONE)\n    }\n  }\n\n  /**\n   * Returns the name of the main component registered from JavaScript."
    );
  }

  return source;
}

function ensureMainActivityCapturePolicy(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const packageName = config.android?.package;

      if (!packageName) {
        return config;
      }

      const mainActivityPath = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        ...packageName.split("."),
        "MainActivity.kt"
      );

      if (!fs.existsSync(mainActivityPath)) {
        return config;
      }

      let source = fs.readFileSync(mainActivityPath, "utf8");

      source = addImport(source, "import android.media.AudioAttributes");
      source = addImport(source, "import android.media.AudioManager");
      source = addImport(source, "import android.view.WindowManager");
      source = ensureOnCreateCalls(source);
      source = ensureOnResume(source);
      source = ensureSecureMethods(source);

      fs.writeFileSync(mainActivityPath, source);

      return config;
    },
  ]);
}

module.exports = function withAndroidSecureCapture(config) {
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];

    if (application) {
      application.$["android:allowAudioPlaybackCapture"] = "false";
    }

    return config;
  });

  return ensureMainActivityCapturePolicy(config);
};
