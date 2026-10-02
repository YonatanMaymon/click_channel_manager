## Overview

A Hebrew, mobile-first web app that lets a zimmer owner manage units, prices and bookings in one place, sync availability by iCal, and take direct bookings with payment on their own website.

**Who it's for:** owners of 1–10 zimmer units in Israel, mostly non-technical, managing from their phone.

**Success criteria for the MVP:**
- No double bookings in that month
- A new owner can set up their first unit and connect one channel in under 30 minutes without help
- A guest can book and pay a deposit on the owner's site in under 3 minutes

## Users and roles

The MVP has two kinds of users: owners who log in, and guests who don't.

| Role  | Logs in?                                  | Can do                                                                                              |
| ----- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Owner | Yes, by phone number + SMS code, or email | Manage their own property, units, prices, bookings, channels and settings; sees only their own data |
| Guest | No                                        | Check availability, book, pay, receive confirmation and invoice                                     |

One owner account = one property (a zimmer complex) with one or more units. Several owners per property, staff accounts and admin tools for you come later.

## Owner screens

Seven screens, all in Hebrew, right to left, usable one-handed on a phone.

### 1. Onboarding

A step-by-step setup for a new owner:

1. Sign up with phone number or email
2. Property name, address, contact phone, check-in and check-out times
3. Add the first unit (name, max guests, photos, short description)
4. Set base prices (weekday, weekend)
5. Optional: paste an iCal link from a portal, Booking.com or Airbnb
6. Done: show the calendar and the code to embed the booking widget

### 2. Units

- List of units with photo, name, max guests
- Add, edit, hide a unit
- Per unit: name, description, max adults and children, photos (up to 10), amenities (jacuzzi, pool, kitchen, etc.)

### 3. Calendar (home screen)

- Month view, one row per unit, days across
- Each booking shows as a bar with guest name and source (direct, hapisga, Booking.com...) in a different color per source
- Blocked dates shown in grey
- Tap an empty date → add a booking or block dates
- Tap a booking → booking details
- Swipe between months; jump to today
- Jewish holidays and Shabbat marked

### 4. Booking details

- Guest name, phone, email, number of guests, dates, unit, source
- Price breakdown: nights, add-ons, total, deposit paid, balance due
- Status: pending, confirmed, cancelled
- Notes field for the owner
- Actions: edit dates or unit, cancel, mark balance as paid, resend confirmation, call or WhatsApp the guest, issue invoice
- Bookings that came in by iCal show only what the channel sends (usually dates and a name) and can't be edited here

### 5. Prices and rules

- Base price per unit: weekday night, weekend night (Thursday, Friday, Saturday configurable)
- Special periods: date range with its own price (holidays, summer, August)
- Minimum nights: default, on weekends, and per special period
- Extra guest fee above a set number of guests
- Add-ons with price: breakfast, late check-out, decoration, etc.
- Deposit: percentage or fixed amount, taken at booking
- Cancellation policy: free until X days before, then Y% charged

### 6. Channels

- List of connected channels with last sync time and status (OK or error)
- Add a channel: name + its iCal import link
- Each unit has its own iCal export link to paste into each channel
- Manual "sync now" button

### 7. Settings

- Property details and logo
- Payment provider setup (Cardcom or PayPlus keys)
- Invoicing service setup
- Message templates for confirmation and reminder
- Booking widget code and colors
- Subscription and billing (later)

## Guest booking widget

A small widget the owner embeds on their own website; the guest books without an account.

If no unit is free, the widget suggests the nearest available dates. Availability is checked again at the moment of payment so two guests can't book the same night.

- **Dates and guests:** date picker showing unavailable nights greyed out; minimum-night rules applied
- **Unit and add-ons:** available units with photos, price per night and total; add-ons as checkboxes
- **Guest details:** name, phone, email, special requests; agree to cancellation policy
- **Pay deposit:** payment provider's hosted page; shows deposit now and balance due
- **Confirmed:** thank-you screen with booking number; confirmation sent by SMS and email

## Payments, invoices and guest messages

The app never sees or stores card numbers; the payment provider handles the card and returns a token.

**Payments**

- Provider: Cardcom first, PayPlus as a second option; the owner enters their own account keys in Settings
- Guest pays on the provider's hosted payment page (in an iframe or redirect)
- Charge the deposit at booking; save a card token for the balance or cancellation fee
- Owner can charge the balance from booking details, or mark it as paid in cash or bank transfer
- Refund from booking details when cancelling
- Test mode on until the owner switches it off

**Invoices**

- After each successful payment, automatically issue a receipt or tax invoice through an Israeli invoicing service's API
- The owner chooses document type based on their business status (עוסק פטור or עוסק מורשה)
- Invoice is emailed to the guest and linked in booking details

**Guest messages**

- Confirmation right after booking: dates, unit, total, deposit paid, address, check-in time
- Reminder 2 days before arrival with directions and owner's phone
- Cancellation notice when cancelled
- Channels: email and SMS in the MVP; WhatsApp when its business messaging is set up
- Owner edits the templates in Settings; Hebrew by default

## iCal sync and double-booking protection

iCal blocks dates only and updates with a delay, so the app must assume a short window where two channels can sell the same night.

**Import (channel → app)**

- Fetch every connected channel's iCal link every 10–15 minutes, plus on "sync now"
- Each event becomes a booking marked with its source; update or remove it when the channel changes or deletes it
- Never delete a direct booking because of an iCal import

**Export (app → channels)**

- One iCal export link per unit, listing all bookings and blocked dates from every source
- The channel fetches it on its own schedule; the owner can't control how often

**Protection**

- Before a direct booking is confirmed, re-check availability in the same database transaction so two guests can't take the same night on the owner's site
- If an import creates an overlap, flag it in red on the calendar and send the owner an SMS and email right away
- If a channel's link fails 3 times in a row, mark it as "error" and alert the owner
- Keep a log of every sync: time, channel, events added, changed, removed

## Data model

Nine main records; Claude Code will turn these into database tables.

| Record | Main fields | Belongs to |
| --- | --- | --- |
| Owner | name, phone, email, login method | — |
| Property | name, address, phone, check-in/out times, logo, business type | Owner |
| Unit | name, description, max guests, photos, amenities, active | Property |
| Price rule | unit, type (base / weekend / special period), dates, price per night, minimum nights | Unit |
| Add-on | name, price, per night or per stay | Property |
| Booking | unit, dates, guest name/phone/email, guests count, source, status, total, deposit, balance, notes | Unit |
| Payment | booking, amount, type (deposit / balance / refund), provider reference, card token, status | Booking |
| Invoice | booking, payment, number, type, link to document | Booking |
| Channel | property, unit, name, iCal import link, last sync, status | Unit |

Card tokens come from the payment provider; real card numbers are never stored.

## Non-functional requirements

- **Language:** Hebrew interface, right to left throughout; guest widget in Hebrew with an English option
- **Mobile first:** every owner screen works on a 375 px wide phone; large tap targets
- **Speed:** calendar loads in under 2 seconds on 4G
- **Dates and money:** Israel time zone, shekels, Sunday as first day of the week
- **Security:** owners see only their own data; logins expire; all traffic over HTTPS; payment keys stored encrypted
- **Privacy:** guest data kept only as long as needed; follows Israeli privacy law
- **Backups:** automatic daily database backup, kept for 30 days
- **Monitoring:** alerts to you when the site is down or a sync job fails
- **Accessibility:** follows Israeli web accessibility rules for the guest widget

## Out of scope and open questions

**Not in the MVP**

- Direct API connections to Booking.com, Airbnb or Israeli portals (iCal only)
- Price changes pushed to channels
- Reports and statistics
- Several users per property, staff roles
- Owner mobile app (the web app works on the phone)
- Dynamic pricing, guest reviews, guest app
- Your own subscription billing for owners

**Open questions**

- [ ] Which invoicing service to integrate first?
- [ ] Owner login: phone + SMS code, email, or both?
- [ ] Is a deposit always required, or can an owner choose "pay on arrival"?
- [ ] Should the booking widget live on the owner's site only, or also on a hosted page you provide?
- [ ] Which add-ons are most common among the owners you interview?
- [ ] Which Israeli portals can export and import iCal today?
