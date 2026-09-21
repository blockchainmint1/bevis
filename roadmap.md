# Roadmap

- [x] Rename action item "Notarise" → "Create" (tab bar + publish page CTAs)
- [x] Replace user-facing "coin(s)" wording with "asset(s)" (code identifiers and legacy API paths unchanged)
- [x] Remove the "Welcome to the new BEVIS" popup (LegacyImportPrompt deleted)
- [x] Mobile/foldable view too small — wider content column + larger root type at ≥600px / ≥900px

## Legacy account migration (Sep 2026)
- [x] Import 6,401 legacy Cold Storage Coins accounts into BEVIS auth (bcrypt hashes carried over; passwords unchanged)
- [x] Wipe imported password hashes from the staging table after import
- [x] "Restore my asset list" button on /import calling the legacy list endpoint server-side
- [x] Legacy list restore live: `?email=` + `x-api-key` variant wired, LEGACY_API_KEY set

- [x] Point all chain-verification links at mempool.texitcoin.org (shows OP_RETURN data)
- [x] Remove TXC_EXPLORER secret usage
- [x] Wrap long SHA-256 values in the record ledger

## Card payments (Sep 2026)
- [x] Built-in payments enabled (test environment)
- [x] "Notarisation fuel" product with $5 / $10 / $25 top-ups
- [x] /topup embedded checkout, works signed in or as a device
- [x] Webhook credits the buyer's own fuel address with TXC from the house wallet (live only)
- [x] Complete go-live so real card payments credit real fuel

## Android app (Sep 2026)
- [ ] Produce the first BEVIS APK (Capacitor shell → `https://app.bevis.sg/app`) — needs a machine with JDK 21 + Android SDK, or a GitHub Actions runner
- [ ] Create the signing keystore and add the four CI secrets before a release build

## TEXITcoin wallet reliability (Sep 2026)
- [x] Replace routine node-wide UTXO scans with indexed address lookups
- [x] Keep a bounded, non-destructive node scan fallback
- [x] Verify indexed results, fallback behavior, and malformed-response handling
