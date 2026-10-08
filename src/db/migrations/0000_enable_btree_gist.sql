-- Lets an exclusion constraint combine "same unit" (=) with "overlapping dates" (&&),
-- so the database itself can reject double bookings (bookings table, phase 3).
-- Ships with Postgres; available on managed hosts such as Railway.
CREATE EXTENSION IF NOT EXISTS btree_gist;
