# Roadmap

- [x] Rename action item "Notarise" → "Create" (tab bar + publish page CTAs)
- [x] Replace user-facing "coin(s)" wording with "asset(s)" (code identifiers and legacy API paths unchanged)
- [x] Remove the "Welcome to the new BEVIS" popup (LegacyImportPrompt deleted)
- [x] Mobile/foldable view too small — wider content column + larger root type at ≥600px / ≥900px

## Legacy account migration (Sep 2026)
- [x] Import 6,401 legacy Cold Storage Coins accounts into BEVIS auth (bcrypt hashes carried over; passwords unchanged)
- [x] Wipe imported password hashes from the staging table after import
- [x] "Restore my asset list" button on /import calling the legacy list endpoint server-side
- [ ] Waiting on Admin team: API-key `?email=` variant of `/api/public/app/v1/bevis/legacy-list`; then set `LEGACY_API_KEY` secret
