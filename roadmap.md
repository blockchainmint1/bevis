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
