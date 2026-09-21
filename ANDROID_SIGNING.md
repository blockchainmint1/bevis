# BEVIS Android signing — one-time setup

This makes GitHub build a **properly signed** BEVIS APK instead of a debug one.
You only do this once. Keep the key file forever: if you lose it, phones will
refuse to install future updates over the existing app.

Everything below is copy/paste. Do not retype anything.

---

## Step 1 — Create the signing key (WinPC, one time)

You need Java installed (JDK 21, the same one used to build the app).

Open **Command Prompt** and paste this **whole block** at once, then press Enter:

```
mkdir "%USERPROFILE%\Desktop\bevis-signing" && keytool -genkeypair -v -keystore "%USERPROFILE%\Desktop\bevis-signing\bevis.jks" -alias bevis -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=Rearden Metals Pte Ltd, O=Rearden Metals Pte Ltd, L=Singapore, C=SG"
```

It will ask you to **create a password** (twice). Invent a strong one, write it
down somewhere safe — you will need it in Step 3.

When it asks for a "key password for <bevis>", just press **Enter** to reuse the
same password.

Result: `Desktop\bevis-signing\bevis.jks`

---

## Step 2 — Turn the key into text for GitHub

Paste this **whole block** into the same Command Prompt window:

```
certutil -encode "%USERPROFILE%\Desktop\bevis-signing\bevis.jks" "%USERPROFILE%\Desktop\bevis-signing\bevis-base64.txt" && notepad "%USERPROFILE%\Desktop\bevis-signing\bevis-base64.txt"
```

Notepad opens with a block of text. Press **Ctrl+A** then **Ctrl+C** to copy all
of it. (Leave the `-----BEGIN CERTIFICATE-----` lines in — they are ignored.)

---

## Step 3 — Add the four secrets to GitHub

In your repo on GitHub: **Settings → Secrets and variables → Actions → New
repository secret**. Add these four, one at a time:

| Name | Value |
| --- | --- |
| `BEVIS_KEYSTORE_BASE64` | the text you copied in Step 2 |
| `BEVIS_KEYSTORE_PASSWORD` | the password you invented in Step 1 |
| `BEVIS_KEY_ALIAS` | `bevis` |
| `BEVIS_KEY_PASSWORD` | the same password as above |

---

## Step 4 — Build

**Actions → Android APK → Run workflow**. When it finishes, open the run and
download **Artifacts → bevis-apk**, unzip it, and you have a signed `bevis.apk`
ready to sideload.

If the four secrets are missing, the build still works but produces an unsigned
debug APK and shows a warning in the run log.

---

## Safekeeping

- Back up `bevis.jks` and its password somewhere permanent (password manager).
- Never commit `bevis.jks`, `bevis-base64.txt`, or `keystore.properties` to the
  repo — they are already excluded by `.gitignore`.
- You can delete the Desktop copies after Step 3 **only if** you have a backup.
