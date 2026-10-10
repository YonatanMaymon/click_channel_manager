import { sql } from "drizzle-orm";
import {
  check,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Decides which document a guest gets after paying (phase 7): a receipt from
// an עוסק פטור, a tax invoice-receipt from an עוסק מורשה. An enum, so the
// database itself rejects any other value.
export const businessType = pgEnum("business_type", [
  "osek_patur",
  "osek_murshe",
]);

// One zimmer complex. Its owner is the Better Auth user whose property_id
// points here (added with Better Auth); every owner-owned table will have a
// property_id pointing here too.
export const properties = pgTable(
  "properties",
  {
    // Random, so widget and iCal links that contain it can't be guessed
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    // One line, used as-is in guest messages
    address: text().notNull(),
    // Contact phone in international form, e.g. +972501234567
    phone: text().notNull(),
    checkInTime: time().notNull().default("15:00"),
    checkOutTime: time().notNull().default("11:00"),
    // Empty until the owner fills it in from Settings; needed before invoicing
    businessType: businessType(),
    // Where the logo file is stored; empty if the owner has no logo
    logoKey: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // Set by the database's clock on every update, like createdAt
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    // Required means more than blank: "" or "   " would show as nothing
    check("properties_name_not_blank", sql`btrim(${table.name}) <> ''`),
    check("properties_address_not_blank", sql`btrim(${table.address}) <> ''`),
    check("properties_phone_not_blank", sql`btrim(${table.phone}) <> ''`),
  ],
);
