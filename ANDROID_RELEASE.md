# BEVIS Android — publishing an update

Each APK is pinned to IPFS and recorded in the `app_releases` table. Installed
phones ask a fixed, key-free feed on launch, so even a year-old install can
discover a new build.

| Piece | What it does |
| --- | --- |
| `scripts/publish-release.sh` | Pins the APK to IPFS and records the release |
| `/api/public/apk` | Streams the newest APK with correct Android headers |
| `/api/public/latest-release?platform=android` | The feed installed apps poll |
| `/api/public/hooks/publish-release` | Records a release (needs `RELEASE_PUBLISH_SECRET`) |
| `/android` | Public download page with checksum + IPFS pin |
| Settings → App version | In-app update card (native only) |

## Publishing a new build

Build the APK (see `ANDROID.md`), then from the repo folder:

```
export PINATA_JWT=your-pinata-jwt
```

```
export RELEASE_PUBLISH_SECRET=the-value-from-project-secrets
```

```
./scripts/publish-release.sh ./bevis.apk 1.1 "What changed in this build"
```

That prints the IPFS CID and checksum, and from then on everyone sees the
update on next launch.

## Notes

- Never hand out a raw IPFS gateway link: Chrome saves it as `.zip` and
  tap-to-install breaks. Always share `https://app.bevis.sg/api/public/apk`.
- The version you pass must match the APK's own version name, or the update
  card will keep nagging people who already installed it.
- The CID *is* the checksum — anyone can verify they got exactly our file.
- The native shell loads the live website, so day-to-day website changes need
  no new APK. Rebuild only for permissions, plugins, icons, or the shell URL.

## Currently published

- Android **1.0** — `QmYfBVyX6SfbojbCQ1UVohkMFdk8xk3ZMA9DtZnSE4woDG` (7.7 MB)
