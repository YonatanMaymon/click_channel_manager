CREATE TYPE "public"."business_type" AS ENUM('osek_patur', 'osek_murshe');--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"check_in_time" time DEFAULT '15:00' NOT NULL,
	"check_out_time" time DEFAULT '11:00' NOT NULL,
	"business_type" "business_type",
	"logo_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_name_not_blank" CHECK (btrim("properties"."name") <> ''),
	CONSTRAINT "properties_address_not_blank" CHECK (btrim("properties"."address") <> ''),
	CONSTRAINT "properties_phone_not_blank" CHECK (btrim("properties"."phone") <> '')
);
