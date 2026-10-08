# Build Plan

How the MVP in [MVP Spec.md](MVP%20Spec.md) gets built, phase by phase, using the stack in [TECH_STACK.md](TECH_STACK.md).

Each phase ends with something you can open on your phone and check. Tick the boxes as tasks are finished so this file always shows where the project stands.

## Phases at a glance

| # | Phase | Result | Size | Needs from you first |
|---|---|---|---|---|
| 0 | Foundation | Empty Hebrew app live on the internet, worker running | S | Accounts: GitHub, Railway, Sentry |
| 1 | Login and property | Owner signs up and fills in property details | M | SMS gateway account; login decision |
| 2 | Units | Owner adds units with photos | S | Cloudflare account (R2) |
| 3 | Calendar and bookings | Home calendar with manual bookings and blocks | L | — |
| 4 | Prices and rules | Pricing engine and prices screen | M | Common add-ons; deposit decision |
| 5 | iCal sync | Channels import and export, overlap alerts | M | Resend account; which portals support iCal |
| 6 | Guest widget and payments | Guest books and pays a deposit on the owner's site | L | Cardcom test account |
| 7 | Invoices and guest messages | Automatic invoices, confirmations, reminders | M | Invoicing service sandbox account |
| 8 | Hardening and pilot | Ready for real owners and real money | M | 2–3 pilot owners |

Sizes are relative: L is roughly twice an M, an M twice an S.

## Before you start

Some accounts take days to approve, so open them early:

- [ ] **Cardcom** test/developer account (needed by phase 6)
- [ ] **Invoicing service** sandbox account, Morning unless decided otherwise (needed by phase 7); check which plans include API access
- [ ] **SMS gateway** account, InforU or 019, and register a Hebrew sender name (needed by phase 1)
- [ ] **Domain name** for the app (needed by phase 5, for email sending and stable iCal links)
- [ ] GitHub, Railway, Cloudflare, Resend, Sentry, Better Stack (free tiers are enough to start)

Open questions from the spec, and the phase that needs the answer:

| Question | Needed by | Suggested answer |
|---|---|---|
| Owner login: phone, email or both? | Phase 1 | Both: phone + SMS code as the main option, email as a fallback |
| Is a deposit always required, or can an owner choose "pay on arrival"? | Phase 4 | Let the owner set the deposit to 0% (pay on arrival); the card token is still saved for cancellation fees |
| Which add-ons are most common? | Phase 4 | Ask in owner interviews; these become the default add-ons list |
| Which Israeli portals support iCal? | Phase 5 | Check each portal and collect a sample `.ics` file from each for tests |
| Widget on the owner's site only, or also a hosted page? | Phase 6 | Both, at no extra cost: the widget is a hosted page that the embed script shows in an iframe |
| Which invoicing service first? | Phase 7 | Morning, unless Cardcom's own invoicing covers it (see TECH_STACK.md) |

## How to work through this plan with Claude Code

- **One phase at a time, one task per session.** Ask Claude Code to "do the next unchecked task in PLAN.md". For bigger tasks, ask it to make a plan first and review the plan before any code is written.
- **Check every task on your phone.** Run the app locally and open it on your phone over Wi-Fi, or use the staging deployment on Railway.
- **Keep tests green.** Every task that touches prices, availability or sync comes with tests. Ask Claude Code to run them before each commit.
- **Review before merging.** Run `/code-review` at the end of each phase, and `/security-review` after phases 1, 6 and 8 (login, payments, launch).
- **Keep this file current.** Tick boxes as tasks finish; if a decision changes the plan, update the plan.

---

## Phase 0 — Foundation

**Goal:** an empty but real app: Hebrew, right to left, deployed, with a database and a worker.

- [x] Create the Next.js app with TypeScript, pnpm, Tailwind, shadcn/ui, ESLint and Prettier
- [x] Hebrew and RTL: `dir="rtl"`, Hebrew font, next-intl with Hebrew as the default
- [x] Postgres for development and tests in Docker (Docker Desktop on Windows)
- [x] Drizzle set up with the first migration
- [x] Worker process using pg-boss, with a heartbeat job that runs every minute
- [x] Vitest and Playwright set up, with one passing test each (Playwright at 375 px width)
- [x] Deploy to Railway: web app, worker and Postgres 18 (same major version as compose.yaml) in an EU region, with a staging environment. Set the worker's `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` to 30 so running jobs can finish during a deploy
- [x] Sentry connected to both the web app and the worker
- [x] `CLAUDE.md` in the repo that points to the spec, TECH_STACK.md and PLAN.md

**Done when**
- A Hebrew page is live on a Railway HTTPS address and reads right to left on your phone
- The worker's heartbeat shows in the logs every minute
- A deliberately thrown error appears in Sentry

## Phase 1 — Login and property

**Goal:** an owner can sign up, log in and describe their property.

- [ ] Database tables: owners, properties (including business type: עוסק פטור / עוסק מורשה)
- [ ] `SmsProvider` interface and the chosen Israeli SMS gateway behind it
- [ ] Better Auth with phone + SMS code and email + code; sessions expire
- [ ] The login check (Next.js proxy) lets `/rpt` through: it's the Sentry tunnel in `next.config.ts`, and blocking it silently stops all browser error reports
- [ ] Rate limits on sending login codes (SMS costs money and attracts abuse)
- [ ] Helper that limits every query to the logged-in owner's property, with tests proving owner A can't read owner B's data
- [ ] App layout for phones: bottom navigation, large tap targets
- [ ] Onboarding steps 1–2: sign up, property details (name, address, phone, check-in/out times)
- [ ] Settings: edit property details and upload a logo

**Done when**
- On your phone, you sign up by SMS code, enter property details, log out and log back in
- A second test owner sees none of the first owner's data

## Phase 2 — Units

**Goal:** an owner can add and manage their units.

- [ ] Database tables: units, unit photos, amenities
- [ ] Photo upload to Cloudflare R2: compressed on the phone before upload, resized to WebP on the server, up to 10 per unit, reorderable
- [ ] Units screen: list with photo, name and max guests; add, edit, hide
- [ ] Unit form: name, description, max adults and children, amenities
- [ ] Onboarding step 3: add the first unit

**Done when**
- You add a unit with several photos from your phone on mobile data, without long waits
- A hidden unit no longer appears in lists meant for guests

## Phase 3 — Calendar and bookings

**Goal:** the home screen. The owner sees and manages every booking in one place.

- [ ] Database table: bookings (dates as `date`, source, status, guest details, notes). Blocked dates are stored as bookings of kind "block"
- [ ] **Availability service:** the single function that locks the unit's row, checks for overlaps and saves, all in one transaction. Every way of creating a booking (owner, widget, iCal) goes through it. A database exclusion constraint (btree_gist, enabled in phase 0) also rejects overlapping direct bookings, as a safety net if the code has a bug
- [ ] Tests for the availability service, including two bookings for the same night saved at the same moment: exactly one succeeds
- [ ] Calendar screen: month view, one row per unit, days across, weeks starting Sunday
- [ ] Booking bars with guest name and a colour per source; blocked dates in grey
- [ ] Swipe between months; "today" button
- [ ] Jewish holidays and Shabbat marked, using @hebcal/core
- [ ] Tap an empty date: add a booking or block dates
- [ ] Booking details screen: guest details, dates, unit, source, status, notes; edit dates or unit; cancel; call or WhatsApp the guest
- [ ] Load only the visible month's data so the calendar stays fast

**Done when**
- You add, move and cancel bookings from your phone
- Creating an overlapping booking is refused with a clear message
- Holidays and Shabbat show on the calendar
- The calendar loads in under 2 seconds with the browser throttled to 4G speed

## Phase 4 — Prices and rules

**Goal:** the app can price any stay correctly.

- [ ] Database tables: price rules, add-ons, plus deposit and cancellation settings on the property
- [ ] **Pricing engine** as a pure function: unit + dates + guests + add-ons → nightly breakdown, add-ons, extra guest fees, total, deposit, balance
- [ ] Thorough tests for the pricing engine: stays crossing into a special period, weekend nights, minimum nights for weekends and special periods, extra guests, per-night vs per-stay add-ons, percentage vs fixed deposit
- [ ] Prices screen: weekday and weekend prices per unit, which days count as weekend, special periods, minimum nights, extra guest fee
- [ ] Add-ons screen with sensible defaults (breakfast, late check-out, decoration)
- [ ] Deposit (percentage, fixed amount, or 0% for pay on arrival) and cancellation policy (free until X days, then Y%)
- [ ] Onboarding step 4: base prices
- [ ] Manual bookings from the calendar get their price filled in by the engine (owner can override)

**Done when**
- All pricing tests pass
- Prices for a few stays you work out by hand match what the app shows

## Phase 5 — iCal sync

**Goal:** bookings from Booking.com, Airbnb and portals appear on the calendar, and the app's bookings block dates on those channels.

- [ ] Database tables: channels, sync log
- [ ] `EmailProvider` interface with Resend behind it; domain verified for sending
- [ ] Channels screen: list with last sync time and status; add a channel (name, unit, iCal link); "sync now" button
- [ ] iCal export: one link per unit with an unguessable token, listing every booking and block from every source
- [ ] Import job in the worker: each channel every 10–15 minutes, spread out so they don't all run at once
- [ ] Import logic: match events by their ID; add, update, or remove bookings from that channel only; never touch direct bookings
- [ ] Tests using real sample `.ics` files from Airbnb, Booking.com and each Israeli portal
- [ ] Overlaps created by an import: shown in red on the calendar, SMS and email to the owner right away
- [ ] A channel that fails 3 times in a row is marked "error" and the owner is alerted
- [ ] Sync log: time, channel, events added, changed, removed
- [ ] Onboarding step 5: paste an iCal link

**Done when**
- A real Airbnb or Booking.com calendar shows up in the app within 15 minutes
- Blocking a date on that channel appears in the app; removing it removes it
- The app's export link, added to Google Calendar, shows all bookings
- A deliberately created overlap turns red and you receive an SMS and an email

## Phase 6 — Guest widget and payments

**Goal:** a guest books and pays a deposit on the owner's website in under 3 minutes.

- [ ] Hosted widget page per property, in Hebrew with an English option
- [ ] Embed script: a short code the owner pastes into their site; it shows the widget in an iframe that resizes itself
- [ ] Step 1, dates and guests: unavailable nights greyed out, minimum nights enforced
- [ ] Step 2, unit and add-ons: available units with photos, price per night and total from the pricing engine
- [ ] When nothing is free, suggest the nearest available dates
- [ ] Step 3, guest details: name, phone, email, special requests, agree to the cancellation policy
- [ ] **Hold:** before the guest goes to pay, the dates are saved as a pending booking that expires after 15 minutes; a worker job releases expired holds
- [ ] `PaymentProvider` interface with Cardcom behind it: hosted payment page, deposit charge, card token saved
- [ ] Payment webhook: verify it really came from Cardcom, confirm the hold, re-check availability
- [ ] Step 4 and 5: pay deposit on Cardcom's page, then a thank-you screen with the booking number
- [ ] Settings: Cardcom keys (stored encrypted), test mode on until the owner turns it off, widget colours and embed code
- [ ] Booking details: price breakdown, deposit paid, balance due; charge the balance with the saved token; mark balance paid in cash or transfer; refund when cancelling, following the cancellation policy
- [ ] Onboarding step 6: show the calendar and the embed code
- [ ] Accessibility pass on the widget: Israeli standard IS 5568 (based on WCAG AA), keyboard and screen-reader checks
- [ ] Playwright test of the full booking at 375 px width
- [ ] PayPlus behind the same `PaymentProvider` interface, once Cardcom is solid

**Done when**
- In test mode, you book and pay a deposit through the widget embedded on a test website, from your phone, in under 3 minutes
- Two guests trying to pay for the same night at the same time: one gets the booking, the other is told the dates are taken
- From booking details you charge the balance and refund a cancelled booking

## Phase 7 — Invoices and guest messages

**Goal:** after every payment the guest automatically gets the right documents and messages.

- [ ] `InvoiceProvider` interface with the chosen invoicing service behind it; keys in Settings, stored encrypted
- [ ] After each successful payment, a worker job issues a receipt (עוסק פטור) or a tax invoice-receipt (עוסק מורשה), retrying on failure
- [ ] Invoice emailed to the guest and linked from booking details; "issue invoice" action for manual cases
- [ ] Message templates for confirmation, reminder and cancellation, in Hebrew by default, with placeholders (guest name, dates, unit, total, deposit, address, check-in time, directions, owner's phone)
- [ ] Templates editable in Settings, with a preview
- [ ] Confirmation sent by SMS and email right after booking
- [ ] Reminder sent 2 days before arrival, at a fixed morning hour Israel time
- [ ] Cancellation notice when a booking is cancelled
- [ ] "Resend confirmation" action in booking details
- [ ] Log of every message sent, visible in booking details

**Done when**
- A test booking produces an invoice in the invoicing service's sandbox, linked from booking details
- You receive the confirmation by SMS and email, and the reminder for a booking 2 days away
- An edited template is what actually gets sent

## Phase 8 — Hardening and pilot

**Goal:** safe to use with real owners, real guests and real money.

- [ ] Security review: data separation between owners, rate limits, webhook verification, login expiry, encrypted keys
- [ ] Backups: nightly `pg_dump` to R2, deleted after 30 days; **restore one** to prove it works
- [ ] Monitoring: Better Stack uptime alerts; Sentry alerts on failed sync, payment, invoice and message jobs
- [ ] Privacy: guest data deleted or anonymised after a set period, privacy policy page; check obligations under the Israeli Privacy Protection Law
- [ ] Accessibility statement (הצהרת נגישות) for the widget
- [ ] Performance check on a real phone on 4G: calendar under 2 seconds
- [ ] Watch a new owner set up a unit and connect a channel without help, and time it
- [ ] Pilot with 2–3 owners: test mode off, real payments, real channels

**Done when** the spec's three success criteria are met with pilot owners:
- No double bookings during the month
- A new owner sets up their first unit and connects a channel in under 30 minutes without help
- A guest books and pays a deposit in under 3 minutes
