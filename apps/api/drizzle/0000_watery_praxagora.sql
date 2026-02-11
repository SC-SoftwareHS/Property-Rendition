CREATE TYPE "public"."asset_category" AS ENUM('furniture_fixtures', 'machinery_equipment', 'computer_equipment', 'leasehold_improvements', 'vehicles', 'inventory', 'supplies', 'leased_equipment', 'other');--> statement-breakpoint
CREATE TYPE "public"."billing_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."rendition_status" AS ENUM('not_started', 'in_progress', 'review', 'approved', 'filed');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('starter', 'professional', 'firm');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'preparer', 'reviewer');--> statement-breakpoint
CREATE TABLE "firms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"subscription_tier" "subscription_tier" DEFAULT 'starter' NOT NULL,
	"billing_status" "billing_status" DEFAULT 'trialing' NOT NULL,
	"stripe_customer_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"role" "user_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"ein" varchar(20),
	"contact_name" varchar(255),
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"industry" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "jurisdictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" varchar(2) NOT NULL,
	"county" varchar(255) NOT NULL,
	"appraisal_district_name" varchar(500) NOT NULL,
	"filing_deadline" date,
	"extension_deadline" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"jurisdiction_id" uuid,
	"name" varchar(255) NOT NULL,
	"address" varchar(500),
	"city" varchar(255),
	"state" varchar(2),
	"zip" varchar(20),
	"county" varchar(255),
	"account_number" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"description" varchar(500) NOT NULL,
	"category" "asset_category" DEFAULT 'other' NOT NULL,
	"original_cost" numeric(14, 2) NOT NULL,
	"acquisition_date" date NOT NULL,
	"disposal_date" date,
	"quantity" integer DEFAULT 1 NOT NULL,
	"is_leased" boolean DEFAULT false NOT NULL,
	"lessor_name" varchar(255),
	"lessor_address" varchar(500),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "asset_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"tax_year" integer NOT NULL,
	"description" varchar(500) NOT NULL,
	"category" "asset_category" NOT NULL,
	"original_cost" numeric(14, 2) NOT NULL,
	"acquisition_date" date NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"is_leased" boolean DEFAULT false NOT NULL,
	"lessor_name" varchar(255),
	"lessor_address" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"jurisdiction_id" uuid NOT NULL,
	"tax_year" integer NOT NULL,
	"status" "rendition_status" DEFAULT 'not_started' NOT NULL,
	"calculated_totals" jsonb,
	"filed_by" uuid,
	"filed_at" timestamp,
	"pdf_url" varchar(1000),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "depreciation_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiction_id" uuid NOT NULL,
	"category" "asset_category" NOT NULL,
	"year_of_life" integer NOT NULL,
	"depreciation_percent" numeric(5, 2) NOT NULL,
	"method" varchar(50) DEFAULT 'straight_line' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" varchar(2) NOT NULL,
	"form_name" varchar(255) NOT NULL,
	"version" varchar(50) NOT NULL,
	"template_url" varchar(1000),
	"field_mappings" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"changed_by" uuid,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_snapshots" ADD CONSTRAINT "asset_snapshots_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renditions" ADD CONSTRAINT "renditions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renditions" ADD CONSTRAINT "renditions_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depreciation_schedules" ADD CONSTRAINT "depreciation_schedules_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "clients_firm_id_idx" ON "clients" USING btree ("firm_id");--> statement-breakpoint
CREATE INDEX "clients_company_name_idx" ON "clients" USING btree ("company_name");--> statement-breakpoint
CREATE UNIQUE INDEX "jurisdictions_state_county_idx" ON "jurisdictions" USING btree ("state","county");--> statement-breakpoint
CREATE INDEX "jurisdictions_state_idx" ON "jurisdictions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "locations_client_id_idx" ON "locations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "locations_jurisdiction_id_idx" ON "locations" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "assets_location_id_idx" ON "assets" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "assets_category_idx" ON "assets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "assets_acquisition_date_idx" ON "assets" USING btree ("acquisition_date");--> statement-breakpoint
CREATE INDEX "asset_snapshots_asset_id_idx" ON "asset_snapshots" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_snapshots_tax_year_idx" ON "asset_snapshots" USING btree ("tax_year");--> statement-breakpoint
CREATE INDEX "renditions_location_id_idx" ON "renditions" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "renditions_tax_year_idx" ON "renditions" USING btree ("tax_year");--> statement-breakpoint
CREATE UNIQUE INDEX "depreciation_schedules_unique_idx" ON "depreciation_schedules" USING btree ("jurisdiction_id","category","year_of_life");--> statement-breakpoint
CREATE UNIQUE INDEX "form_templates_state_form_version_idx" ON "form_templates" USING btree ("state","form_name","version");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_changed_by_idx" ON "audit_logs" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");