// The tables Better Auth (src/lib/auth) reads and writes. Their columns
// follow Better Auth's own list (with its phone-number plugin); only
// users.property_id is ours. Better Auth fills in ids, dates and defaults
// itself, so the database defaults here only matter for rows we add by hand.
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { properties } from "./properties";

const createdAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

// One row per owner. There is no separate owners table: an owner is a user.
export const users = pgTable("users", {
  // Random text from Better Auth, unguessable
  id: text().primaryKey(),
  name: text().notNull(),
  // Unique: email login must lead to exactly one account. Until the owner
  // verifies a real address, this holds a placeholder that can't receive
  // mail (see src/lib/auth/create-auth.ts) and emailVerified is false.
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  // +972xxxxxxxxx, one spelling per number (toAccountPhone in src/lib/sms)
  phoneNumber: text().unique(),
  phoneNumberVerified: boolean(),
  // The property this owner manages. Empty until onboarding step 2 creates
  // it; only the server sets it, never the owner's own request.
  propertyId: uuid().references(() => properties.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// One row per logged-in device. The cookie holds the token; the session ends
// at expiresAt, which moves forward while the app is used.
export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    // Deleting a user logs out all their devices
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

// Ways of logging in that need stored credentials (passwords, Google...).
// Code logins don't use it, but Better Auth requires the table.
export const accounts = pgTable(
  "accounts",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

// Login codes waiting to be entered: which phone or email (identifier), the
// code and wrong-guess count (value), and when it stops working.
export const verifications = pgTable(
  "verifications",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);
