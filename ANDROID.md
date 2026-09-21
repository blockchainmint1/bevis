# BEVIS — Android APK (sideload only)

No Play Store. No app store review. We build a plain `.apk` file, copy it to
the phone, and install it by hand — same as the other projects.

The Android app is a thin shell around the live web app. It opens directly to
`https://app.bevis.sg/app/assets` (the app home, not the marketing site), so
website changes appear in the phone app instantly. You only rebuild the `.apk`
when the app name, icon, splash screen, or that URL changes.

| Setting  | Value                              |
| -------- | ---------------------------------- |
| App id   | `sg.bevis.app`                     |
| App name | `BEVIS`                            |
| Opens    | `https://app.bevis.sg/app/assets`  |
| Android  | 6.0 and newer                      |

> The phone loads the **live published** site. Publish the website before
> building, or the app will show the old version.

---

## Option A — let GitHub build it (easiest, nothing to install)

1. Push your changes to `main` on GitHub.
2. On GitHub, open the **Actions** tab.
3. Click **Android APK** in the left list, then the newest run at the top.
4. Wait for the green check (about 5 minutes).
5. Scroll to the bottom of that page, under **Artifacts**, and download
   **bevis-apk**. It downloads as a `.zip`.
6. Unzip it. Inside is `bevis.apk`.

You can also start a build by hand: **Actions → Android APK →
Run workflow → Run workflow**.

---

## Option B — build it on the WinPC

### One-time setup

1. Install **Java JDK 21** from https://adoptium.net (pick "Temurin 21 (LTS)",
   Windows x64 `.msi`). Click through with all defaults.
2. Install **Android Studio** from https://developer.android.com/studio.
   Run it once and accept every default in the setup wizard — that installs
   the Android SDK it needs.
3. Close Android Studio.

### Build

Open **Command Prompt**, then copy and paste these lines one at a time.
Replace `C:\path\to\bevis` with the folder where the repo lives.

```
cd C:\path\to\bevis
```

```
bun install
```

```
bun run build
```

```
bunx cap add android
```

```
bunx cap sync android
```

```
cd android
```

```
gradlew.bat assembleDebug
```

```
cd ..
```

```
copy android\app\build\outputs\apk\debug\app-debug.apk "%USERPROFILE%\Desktop\bevis.apk"
```

`bevis.apk` is now on your Desktop.

### Rebuilding later

After the first time, `bunx cap add android` will say the folder already
exists — that is fine, skip that line and run the rest.

---

## Installing on the phone

1. Copy `bevis.apk` to the phone (USB cable, Google Drive, or email it to
   yourself and open the attachment).
2. Tap the file on the phone.
3. Android will warn that this app is from an unknown source. Tap
   **Settings**, switch on **Allow from this source**, press Back, then tap
   **Install**.
4. Open **BEVIS** from the app drawer.

To install over the top of an older copy, just install again — the app id is
the same, so it upgrades in place and keeps you signed in.

If you have a cable and developer mode on:

```
adb install -r bevis.apk
```

---

## Icons and splash screen

The artwork lives in `resources/` (`icon.png`, `icon-foreground.png`,
`icon-background.png`, `splash.png`, `splash-dark.png`). After changing any of
them, run:

```
bun run cap:assets
```

then rebuild.

---

## Notes

- The `android` folder is not stored in the repo — `cap add android`
  regenerates it every build. Nothing to commit.
- By default the APK is debug-signed, which is all a sideloaded app needs.
  To produce a properly signed release APK instead, do the one-time setup in
  `ANDROID_SIGNING.md` — the GitHub build picks it up automatically.
