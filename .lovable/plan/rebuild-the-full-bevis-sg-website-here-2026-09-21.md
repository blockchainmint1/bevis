# Rebuild the full bevis.sg website here

Today this project is only the BEVIS app. The plan is to make this one place: a proper
public bevis.sg website at the front, with the existing app living under `/app`.

## What the public site will have

**Home (`/`)**
- Hero: "Bevis is Blockchain for Everyone!" with the intro line about adding proof to
  documents, receipts, records, manufacturing and supply chain data.
- Asset ID lookup box right in the hero — type a 6-digit asset ID, get taken to the
  verification result.
- The "bevis /bee-vus/" dictionary panel (noun + verb definitions, the quote).
- "Two buttons — that's all you need": READ (scan any Bevis QR) and WRITE (record to the
  blockchain).
- Bevis for Business block linking to the business page.
- "See Bevis in Action" — asset ID lookup with a "random asset" button.
- FAQ (the four existing questions, rewritten cleanly).
- Contact section with a working enquiry form (General / Corporate Sales / Tech & Support
  / Billing) that stores submissions and emails us.
- Footer: company address in Singapore, service@bevis.sg, honest.money ecosystem line,
  Terms, Privacy, Manifesto.

**Learn more (`/learn-more`)**
The Genesis / The Technology / "We call it BEVIS, and it means PROOF" / The Blockchain /
The Future — the full story, kept and tightened.

**Personal (`/personal`)** and **Business (`/business`)**
Currently just anchors on the old site. These become real pages: who it's for, what you
can prove, how it works, and a call to action into the app.

**Verify (`/verify`)**
Public, no sign-in: enter an asset ID or scan, see the record, files, IPFS CIDs and the
blockchain transaction, and download the certificate.

**Help / FAQ (`/help`)**, plus the existing Terms, Privacy and Manifesto pages restyled to
match the new site.

## What happens to the app

Everything you use today (assets, create, scan, settings, admin, top-up, alerts, asset
records) moves from `/assets`, `/publish`, … to `/app/assets`, `/app/publish`, and so on.
Old links keep working — anyone hitting an old address gets forwarded to the new one, so
existing users, saved links and the Android build don't break. Signing in lands you in the
app; signing out lands you back on the website.

## Look and feel

Same BEVIS identity as the app (vellum/anthracite, struck-gold accent, serif headings),
but a wide marketing layout rather than the phone-width app shell — full-bleed hero,
generous sections, its own site header with nav and a "Open the app" button.

## Technical notes

- New `src/routes/_site.tsx` layout (site header + footer) with `index`, `learn-more`,
  `personal`, `business`, `verify`, `help`, `terms`, `privacy`, `manifesto` under it.
- `_app.*` route files renamed to `_app.app.*` so the app tree serves `/app/*`; internal
  `Link`/`navigate` targets and the tab bar updated; catch-all redirect routes added for
  the old paths.
- Public asset lookup reuses the existing guest verify server functions — no new backend
  work beyond a `contact_messages` table for the enquiry form.
- Each page gets its own title/description/social metadata.

## Needed from you

Real contact details are carried over from the current site (25B Loyang Crescent #03-15,
Singapore 506817, service@bevis.sg). The App Store / Google Play badges point at the
existing listings. Tell me if any of that has changed.
