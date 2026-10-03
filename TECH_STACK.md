# Tech Stack

The technologies used to build the MVP described in [MVP Spec.md](MVP%20Spec.md), and why each was chosen.

Most of the code will be written by Claude Code, so the stack favours mainstream, well-documented tools with one language end to end, over anything clever or niche.

## Architecture at a glance

One repository and one language (TypeScript), running as two processes that share the same code and the same database:

```
                 ┌──────────────────────────────┐
 Owner (phone) ──►                              │
                 │  Web app (Next.js)           │
 Guest widget  ──►  - owner screens             │
 (iframe on      │  - hosted booking widget     │──┐
 owner's site)   │  - API + payment webhooks    │  │
                 │  - iCal export links         │  │
 Booking.com,  ──►                              │  │    ┌────────────┐
 Airbnb, portals └──────────────────────────────┘  ├───►│ PostgreSQL │
 (fetch export)                                    │    └────────────┘
                 ┌──────────────────────────────┐  │
                 │  Worker (Node, pg-boss)      │──┘
                 │  - iCal import every 10–15m  │
                 │  - reminders, SMS, email     │
                 │  - invoice issuing, retries  │
                 └──────────────────────────────┘
```

External services: Cardcom / PayPlus (payments), Morning (invoices), Resend (email), an Israeli SMS gateway, Cloudflare R2 (photos), Sentry and Better Stack (monitoring).

## Core

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** everywhere | One language for owner app, widget, API and background jobs. The best Jewish-calendar library (Hebcal) is in JS. |
| Framework | **Next.js** (App Router) | Owner app, hosted booking-widget page, API routes and payment webhooks in one codebase. Largest ecosystem, and the framework Claude Code knows best. |
| Database | **PostgreSQL** | Transactions, row locks and date-range types are what make "no double bookings" reliable. |
| DB access | **Drizzle ORM** + **drizzle-kit** migrations | Typed queries that stay close to SQL, so overlap checks, constraints and `FOR UPDATE` locks stay easy to write and read. |
| Background jobs | **pg-boss** in a separate worker process | A job queue and scheduler stored in Postgres: iCal sync every 10–15 minutes, the 2-day reminders, retries for SMS, email and invoices. No Redis to run. |
| Auth | **Better Auth** with phone OTP and email OTP | Sessions are stored in our own database and we plug in our own SMS provider. Supports both login methods, so the open login question doesn't block us. |
| Validation | **Zod** | One schema validates forms, API input and webhook payloads. |

## Frontend

| Layer | Choice | Why |
|---|---|---|
| Styling | **Tailwind CSS** | Logical classes (`ms-`, `pe-`, `start-`) flip automatically in right-to-left layouts. |
| Components | **shadcn/ui** (built on Radix) | Accessible components we own as source code, needed for the guest widget's accessibility rules. |
| Forms | **React Hook Form** + Zod | Fast forms on phones, with validation shared with the server. |
| Owner calendar | **Custom CSS grid** | A units × days grid is simple to build. Off-the-shelf resource calendars are paid and don't handle RTL or touch well. |
| Widget date picker | **react-day-picker** | Hebrew locale, RTL, Sunday as first day, unavailable nights greyed out. |
| Dates | **date-fns** + **@date-fns/tz** (Asia/Jerusalem) | Small, reliable date maths with time-zone support. |
| Jewish holidays and Shabbat | **@hebcal/core** | Works offline with no API calls. Can also suggest holiday price periods. |
| Translations | **next-intl** | Hebrew by default everywhere; English option for the guest widget. |
| Font | **Heebo** (Google Fonts, self-hosted by next/font) | Clear Hebrew font that reads well on small screens, with Latin letters and numbers included. |

## Integrations

| Need | Choice | Notes |
|---|---|---|
| Payments | **Cardcom** first, **PayPlus** second | Guest pays on the provider's hosted page; we store only the returned card token. Both sit behind one `PaymentProvider` interface so adding the second is contained. |
| Invoices | **Morning (חשבונית ירוקה)** API | Unless owner interviews show most owners use something else. The service handles Israeli tax rules, including allocation numbers (מספר הקצאה). Behind an `InvoiceProvider` interface. |
| Email | **Resend** + **React Email** | Hebrew RTL HTML templates written as React components. |
| SMS | Israeli gateway (**InforU** or **019**) | Cheaper than Twilio for Israeli numbers and supports Hebrew sender names. Behind an `SmsProvider` interface, with Twilio as a fallback. |
| iCal import | **node-ical** | Parses channel feeds into bookings. |
| iCal export | **ical-generator** | One export link per unit, with an unguessable token in the URL. |
| Phone numbers | **libphonenumber-js** | Normalises Israeli numbers (05X → +9725X) for SMS and WhatsApp links. |
| Photos | **Cloudflare R2** + **sharp** | Compressed in the browser before upload (owners are often on 4G), resized to WebP on the server. No fees for serving images. |

## Infrastructure

| Need | Choice | Notes |
|---|---|---|
| Hosting | **Railway** (Render as an alternative) | Web app, worker and Postgres in one project, in an EU region close to Israel. The worker runs all the time, which is awkward on Vercel. |
| Backups | Provider's daily backups + nightly `pg_dump` to R2 | R2 lifecycle rule deletes dumps after 30 days, matching the spec. |
| Errors | **Sentry** | Errors from the web app and the worker, including failed sync jobs. |
| Uptime | **Better Stack** | Alerts when the site is down. |
| Tests | **Vitest** | Unit tests for the pricing engine, availability checks and iCal parsing, where most bugs will hide. |
| End-to-end tests | **Playwright** | Guest booking flow and owner screens at 375 px phone width. |
| Package manager | **pnpm** 10 | pnpm 12's native Windows binary failed to install on this machine; pnpm 10 is plain JavaScript and still maintained. |

## Conventions

Rules that apply across the codebase. Claude Code should follow these when writing code.

- **Money** is stored as whole agorot (integers), never as decimals. Format as shekels only when displaying.
- **Stays** are stored as Postgres `date` values (check-in date, check-out date), not timestamps. `Asia/Jerusalem` is used only to work out "today" and to schedule messages.
- **Weeks start on Sunday** in every calendar and date picker.
- **Owner data is separated by property.** Every owner-owned table has a `property_id`, and every query goes through a helper that limits it to the logged-in owner's property.
- **Right to left first.** `dir="rtl"` on the page, and only logical Tailwind classes (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`), never `ml-`/`mr-`/`left-`/`right-`.
- **Double-booking protection.** A direct booking locks the unit's row, checks for overlaps and inserts in one transaction. A database exclusion constraint also rejects overlapping direct bookings and holds, as a safety net if the code has a bug. When the guest goes to the payment page, the dates become a pending hold that expires after 15 minutes; the payment webhook confirms it. Bookings imported by iCal are allowed to overlap so the clash can be detected and flagged.
- **Payment and invoicing keys** are encrypted in the database (AES-256-GCM) with a master key from environment variables.
- **External services** (payments, invoices, SMS, email) are always called through an interface in the code, never directly from screens or routes, so they can be swapped and mocked in tests.

## To verify before building

- Whether Cardcom can issue receipts and invoices itself. If so, owners on Cardcom may not need a separate invoicing service in the MVP.
- Which SMS gateway (InforU or 019) gives the best price and Hebrew sender-name support.
- That hosting data in an EU region meets Israeli privacy rules for this use (expected to be fine; worth a quick check with a privacy adviser).
