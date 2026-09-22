#!/usr/bin/env bash
# Pin a BEVIS APK to IPFS (Pinata) and announce it to every installed app.
#
# Usage:
#   export PINATA_JWT=...             # pinata.cloud -> API Keys
#   export RELEASE_PUBLISH_SECRET=... # same value as the app's secret
#   ./scripts/publish-release.sh ./bevis.apk 1.1 "What's new text"
#
set -euo pipefail

APK="${1:?usage: publish-release.sh <apk-path> [version] [notes]}"
# Version is optional: taken from the build's filename (bevis-2026.09.22.0641-abc1234.apk),
# otherwise stamped with the current UTC date/time.
VERSION="${2:-}"
if [ -z "$VERSION" ]; then
  BASE="$(basename "$APK")"
  case "$BASE" in
    bevis-*) VERSION="$(echo "$BASE" | sed -E 's/^bevis-(.+)\.apk$/\1/')" ;;
    *) VERSION="" ;;
  esac
fi
[ -n "$VERSION" ] || VERSION="$(date -u +%Y.%m.%d.%H%M)"
NOTES="${3:-}"
APP_BASE="${APP_BASE:-https://app.bevis.sg}"

: "${PINATA_JWT:?set PINATA_JWT}"
: "${RELEASE_PUBLISH_SECRET:?set RELEASE_PUBLISH_SECRET}"
GATEWAY="${PINATA_GW:-gateway.pinata.cloud}"
GATEWAY="${GATEWAY#http://}"; GATEWAY="${GATEWAY#https://}"; GATEWAY="${GATEWAY%/}"

echo "==> Pinning $APK to IPFS"
CID=$(curl -fsS -X POST https://api.pinata.cloud/pinning/pinFileToIPFS \
  -H "Authorization: Bearer $PINATA_JWT" \
  -F "file=@${APK}" \
  -F "pinataMetadata={\"name\":\"bevis-${VERSION}.apk\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["IpfsHash"])')

SHA=$(shasum -a 256 "$APK" | cut -d' ' -f1)
SIZE=$(wc -c < "$APK" | tr -d ' ')

echo "    CID:    $CID"
echo "    sha256: $SHA"

echo "==> Announcing release $VERSION"
curl -fsS -X POST "$APP_BASE/api/public/hooks/publish-release" \
  -H "content-type: application/json" \
  -H "x-release-secret: $RELEASE_PUBLISH_SECRET" \
  -d "$(python3 - "$VERSION" "$CID" "$SHA" "$SIZE" "$NOTES" <<'PY'
import json, sys
v, cid, sha, size, notes = sys.argv[1:6]
print(json.dumps({
  "platform": "android", "version": v, "ipfs_cid": cid,
  "sha256": sha, "size_bytes": int(size), "notes": notes or None,
}))
PY
)"
echo
echo "==> Done. Users see the update on next launch:"
echo "    $APP_BASE/api/public/apk"
echo "    https://$GATEWAY/ipfs/$CID"
