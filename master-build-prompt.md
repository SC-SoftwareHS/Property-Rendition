# RenditionReady — Master Build Prompt

> **How to use this prompt:** Copy this entire document into a new conversation with Claude (or any AI coding assistant like Cursor, Windsurf, etc.). It contains everything needed to build the product from scratch. For best results, work through it phase by phase — don't ask for everything at once. Start with "Let's begin Phase 1" and iterate.

---

## System Context

You are a senior full-stack engineer building **RenditionReady**, a cloud-native SaaS platform that automates business personal property (BPP) tax rendition preparation. This is a greenfield project. You will build it phase by phase, starting with the data foundation and ending with a launch-ready product.

## What This Product Does

Every business that owns tangible assets (furniture, equipment, computers, vehicles, inventory) in **38 U.S. states** must file an annual "rendition" form with their county appraisal district, reporting those assets and their depreciated values. Failure to file triggers a **10% penalty** on total taxes owed; filing inaccurately triggers a **50% penalty**.

The current workflow for CPAs and businesses is entirely manual: download county-specific PDF forms, pull asset data from accounting software or spreadsheets, look up jurisdiction-specific depreciation schedules (which differ from IRS/GAAP depreciation), hand-calculate depreciated values, fill out each form by hand, print and mail. A single rendition takes **30–40 minutes**. A mid-size CPA firm handles 50–300 of these every spring.

**RenditionReady automates this entire workflow.** Users enter client and asset data once, and the system generates print-ready, county-specific rendition forms with correct depreciation calculations. Data rolls forward year-to-year, so subsequent years are incremental updates only.

## Competitive Intelligence

The only direct competitor at this price point is **Personal Property Pro (PPP)** by TorqueWare, Inc.:
- Built in 2001 on **Visual Basic 6.0 + Microsoft Access 2003 + Crystal Reports 10**
- **Desktop-only**, Windows-only — no cloud, no mobile, no Mac
- Covers only **3 of 38 states** (Texas, Oklahoma, Florida — 398 counties total)
- **Explicitly prohibits data export** in its license agreement — no CSV, no Excel, no API
- **No integrations** with any accounting software
- **No deadline tracking**, no electronic filing, no collaboration features
- **1 employee**, ~$155K annual revenue, 150–250 hours/year maintenance
- Owner tried to sell for $395K, couldn't find a buyer
- Zero presence on G2, Capterra, or any review platform
- Only 37% of businesses use ANY property tax software — 63% file manually

**Our advantages:** Cloud-native, full data export, multi-state, integrations, modern UX, team-maintained.

## Target Users

1. **Regional CPA firms** (primary): 5–20 person firms handling 50–300 renditions/year across 1–3 states. Value speed, accuracy, multi-client management, year-over-year rollover.
2. **Multi-location businesses** (secondary): Retail chains, franchise operators with 10–100 locations. Need centralized asset management and deadline tracking.
3. **Solo practitioners / small business owners**: Filing 1–10 renditions/year. Want simplicity above all.

## Tech Stack (use exactly this)

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | **Next.js 14+** (React 18, TypeScript, App Router) | SSR, performance, great DX |
| UI | **Shadcn/ui + Tailwind CSS** | Accessible Radix primitives, rapid iteration |
| Data tables | **TanStack Table** | High-perf grids with sort, filter, inline edit |
| State | **TanStack Query + Zustand** | Server state caching + minimal client state |
| Backend | **Node.js / NestJS** (TypeScript) | Structured modules, DI, auto OpenAPI docs |
| Auth | **Clerk** | Managed auth with MFA, SSO, RBAC |
| Database | **PostgreSQL 16** (Supabase) | Relational integrity, JSONB, RLS |
| ORM | **Drizzle ORM** | Type-safe, SQL-like, fast migrations |
| Cache/Queue | **Redis** (Upstash) | Session cache, BullMQ job queues |
| PDF engine | **Puppeteer** (server-side generation) | Pixel-perfect form output |
| PDF preview | **React-PDF** (client-side) | In-browser preview |
| File storage | **AWS S3 + CloudFront** | PDFs, imports, form templates |
| Payments | **Stripe** | Subscriptions, trials, invoicing |
| Hosting | **Vercel** (frontend) + **AWS ECS Fargate** (backend) | Native Next.js perf + scalable API |
| CI/CD | **GitHub Actions** | Automated test/lint/deploy |
| Monitoring | **Sentry** (errors) + **Datadog** or CloudWatch (APM) | Critical during peak season |

## Data Model

### Core Entities

**Firm** (the account/tenant)
- id, firm_name, primary_contact_email, subscription_tier (starter/professional/firm), stripe_customer_id, stripe_subscription_id, billing_status, created_at, updated_at

**User**
- id, firm_id (FK), name, email, role (admin/preparer/reviewer), clerk_user_id, last_login, created_at, updated_at

**Client** (a business entity the firm prepares renditions for)
- id, firm_id (FK), company_name, ein, contact_name, contact_email, contact_phone, industry_type, notes, created_at, updated_at

**Location** (a physical situs where a client's property resides)
- id, client_id (FK), address, city, county, state, zip, jurisdiction_id (FK), appraisal_district_account_number, created_at, updated_at

**Asset** (an item or category of tangible personal property)
- id, location_id (FK), description, category (enum: furniture_fixtures, machinery_equipment, computer_equipment, leasehold_improvements, vehicles, inventory, supplies, leased_equipment, other), original_cost (decimal), acquisition_date, disposal_date (nullable), quantity (int, default 1), is_leased (boolean), lessor_name, lessor_address, notes, created_at, updated_at

**AssetSnapshot** (point-in-time copy per tax year, created during rollover)
- id, asset_id (FK), tax_year (int), original_cost, depreciated_value, category, acquisition_date, disposal_date, created_at

**Rendition** (a generated filing for a specific Client + Location + TaxYear)
- id, client_id (FK), location_id (FK), tax_year (int), jurisdiction_id (FK), form_type (string), status (enum: not_started/in_progress/review/approved/filed), calculated_totals (JSONB), pdf_url (nullable), filed_date (nullable), preparer_id (FK to User), reviewer_id (FK to User, nullable), created_at, updated_at

### Reference Tables

**Jurisdiction**
- id, state, county, appraisal_district_name, filing_deadline (date), extension_deadline (date, nullable), form_template_ids (int[]), created_at, updated_at

**DepreciationSchedule**
- id, jurisdiction_id (FK), asset_category (enum), useful_life_years (int), depreciation_factors (decimal[] — one factor per year of asset age), notes, created_at, updated_at

**FormTemplate**
- id, state, county (nullable — null means state-default), form_number, form_name, template_file_url, field_mapping (JSONB — maps data fields to template positions), active (boolean), tax_year (int), created_at, updated_at

**AuditLog**
- id, firm_id (FK), entity_type, entity_id, field_name, old_value, new_value, changed_by (FK to User), timestamp

### Key Design Rules
- **Multi-tenancy:** All queries scoped by firm_id. Use PostgreSQL Row-Level Security.
- **JSONB for calculated_totals:** Store the full rendition breakdown (totals by category, by year, depreciated values) as JSONB on the Rendition. This preserves the exact values filed.
- **AssetSnapshot for versioning:** During rollover, create snapshots — never mutate historical asset records.
- **Partition by tax_year:** AssetSnapshot and Rendition tables partitioned for query performance.

## Build Phases

### Phase 1: Foundation & Data Engine (Weeks 1–4)

Build the entire data layer and core CRUD:

1. **Project scaffolding:** Next.js frontend with Tailwind + Shadcn/ui. NestJS backend with Drizzle ORM. PostgreSQL on Supabase. Monorepo (Turborepo or Nx) or separate repos — your call.
2. **Auth:** Clerk integration with MFA. Sign-up flow creates a Firm + first Admin user. Invite flow for additional users.
   - **Sign-in:** Clerk email + password.
   - **MFA:** Optional (if enabled by firm/user policy).
   - **First sign-up:** Creates firm + Admin seat.
3. **Firm settings:** Firm name, logo upload (for branded PDF output later), default tax year.
4. **Client CRUD:** Full create/read/update/delete with search and filtering. Data grid using TanStack Table.
5. **Location management:** Add locations to clients. State + county dropdowns that auto-resolve to a Jurisdiction.
6. **Asset CRUD:** Full asset entry form with all fields. Inline editing in data grid. Category dropdown with the 9 BPP categories.
7. **CSV/Excel import:** Upload a CSV or Excel file → column mapping UI → preview → import. Handle common edge cases (extra columns, missing fields, date format variations). This is critical — many users will onboard by importing from existing spreadsheets.
8. **Database schema:** All entities above with proper indexes, constraints, and RLS policies. Seed data for Jurisdiction table (all 398 TX/OK/FL counties with names, deadlines).

**Done when:** A user can sign up, create a firm, add clients with locations, import 500+ assets via CSV, and view/edit/delete everything.

### Phase 2: Depreciation Engine & Form Generation (Weeks 5–10)

This is the core product. Build the calculation and PDF engines:

1. **Depreciation schedule data:** Populate DepreciationSchedule table for all 398 TX/OK/FL counties. This requires research — each county's appraisal district publishes their schedules (often as PDFs). Key resources:
   - Texas: County appraisal district websites, Texas Comptroller guidelines
   - Oklahoma: County assessor offices, OTC Form 901 instructions
   - Florida: County property appraiser offices, DOR guidelines
   - Start with the big counties (Harris, Dallas, Tarrant, Travis, Bexar in TX; Tulsa, Oklahoma County in OK; Miami-Dade, Broward, Orange in FL) and work outward.

2. **Depreciation calculation engine:** Given an asset (category, original_cost, acquisition_date) and a jurisdiction, calculate the current depreciated value using that jurisdiction's schedule. Handle:
   - Standard declining balance schedules
   - Percent-good tables (Tarrant County style)
   - Floor values (many jurisdictions set a minimum % of original cost)
   - Fully depreciated assets (value = floor, not zero)
   - Monthly proration for mid-year acquisitions (some jurisdictions)

3. **Rendition generation logic:** For a given Client + Location + TaxYear:
   - Gather all active assets at that location
   - Calculate depreciated values for each
   - Group by category and acquisition year
   - Sum totals per the form's requirements
   - Store results in Rendition.calculated_totals (JSONB)

4. **Form templates (HTML/CSS):** Create pixel-accurate HTML templates for:
   - Texas Form 50-144 (standard — covers most counties)
   - Harris County 22.15-BPP variant
   - Tarrant County P1/P2 variant
   - Dallas County custom variant
   - Oklahoma Form 901
   - Oklahoma Form 901-F (freeport)
   - Florida DR-405
   - Florida DR-405EZ
   Each template has a corresponding field_mapping JSON that maps Rendition data to template positions.

5. **PDF generation pipeline:** Puppeteer service that:
   - Receives a rendition ID
   - Loads the correct HTML template
   - Populates with calculated data
   - Renders to PDF at print resolution
   - Uploads to S3
   - Returns the URL
   Use BullMQ for queuing — batch generation can mean hundreds of PDFs.

6. **Browser preview:** React-PDF component that renders the generated PDF inline before the user downloads/prints.

7. **Batch generation:** "Generate All Renditions" button per client (all locations) or globally (all clients for a tax year).

**Done when:** User can select a client, click "Generate Renditions," and get print-ready PDFs that match official county form layouts with correct depreciation calculations.

### Phase 3: Year-Over-Year Rollover & Workflow (Weeks 11–13)

Make it a tool people come back to every year:

1. **Tax year rollover:** One-click "Roll to Tax Year [N+1]" that:
   - Creates AssetSnapshots for all active assets in the current year
   - Copies asset records forward (new snapshots for new year)
   - Does NOT copy disposed assets
   - Preserves the previous year's renditions as historical records
   - Sets all new-year rendition statuses to "not_started"

2. **Tax year selector:** Global dropdown to switch between tax years. All views filter by selected year.

3. **Rendition workflow:** Status pipeline with transitions:
   - not_started → in_progress (when user begins editing)
   - in_progress → review (preparer marks ready)
   - review → approved (reviewer approves)
   - approved → filed (user marks as filed, enters filed_date)
   - Any status can go back to in_progress (for corrections)

4. **Dashboard:** Landing page showing:
   - Total clients, renditions by status (pie/donut chart)
   - Upcoming deadlines (next 30/60/90 days)
   - Recently modified clients
   - Completion percentage for current tax year
   - Quick filters: "Show me everything not yet filed"

5. **Batch operations:** Multi-select clients → bulk status update, bulk PDF generation.

**Done when:** A returning user can roll their entire client base to a new tax year in one click, make incremental asset changes, regenerate renditions, and track progress through the review workflow.

### Phase 4: Export, Billing, Polish & Launch (Weeks 14–16)

Ship it:

1. **Data export:** Every data grid gets an "Export" button → CSV, Excel, or JSON. Clients, assets, renditions, reports — everything exportable. This is a core differentiator vs. PPP.

2. **Roles & permissions:** Enforce at API level:
   - Admin: manage firm, users, billing, all CRUD
   - Preparer: create/edit clients, assets, renditions
   - Reviewer: view everything, approve renditions, cannot edit

3. **Stripe billing:**
   - Starter ($29/mo or $290/yr): 1 user, 25 clients, TX/OK/FL
   - Professional ($79/mo or $790/yr): 5 users, unlimited clients, all states
   - Firm ($149/mo or $1,490/yr): unlimited users, API access, client portal, custom branding
   - 14-day free trial, no credit card required
   - Enforce limits (client count, user count) at API level

4. **Landing page:** Marketing site with:
   - Clear value prop ("File business property tax renditions 10x faster")
   - Feature overview with screenshots
   - Pricing table
   - "Switching from spreadsheets?" comparison
   - "Switching from desktop software?" comparison (subtle PPP targeting)
   - CTA: "Start free trial"

5. **Onboarding:** First-login wizard:
   - Set up firm name
   - Invite team members
   - Create first client
   - Import assets (or enter manually)
   - Generate first rendition
   - "You just did in 5 minutes what takes 40 minutes by hand"

6. **Documentation:** Help center with getting-started guide, CSV import format spec, FAQ. In-app tooltips for depreciation-related fields.

7. **Hardening:** Input validation, error handling, rate limiting, load testing (simulate 50 concurrent users generating PDFs during peak season).

**Done when:** A new user can sign up, choose a plan, enter payment, and be preparing renditions within 15 minutes.

## Important Implementation Notes

### PDF Form Accuracy Is Make-or-Break
County assessors must accept our output. Every form must be visually indistinguishable from the official county form. Test by printing our output and the official blank form side by side. Recruit 3–5 CPA alpha testers to validate before launch.

### Depreciation Schedules Vary by County
Do NOT assume all counties in a state use the same depreciation schedule. Many do, but some (especially large counties like Harris, Dallas, Tarrant) have their own. The DepreciationSchedule table is keyed by jurisdiction_id + asset_category for this reason.

### Jurisdiction-Specific Depreciation ≠ IRS Depreciation
This is the #1 source of errors in manual renditions. BPP depreciation uses county-specific schedules, NOT IRS MACRS or GAAP straight-line. Make this distinction clear in the UI with help text.

### The Business Is Intensely Seasonal
90%+ of usage happens January through April. The product MUST launch by late January to capture that year's season. Plan accordingly.

### Texas Is the Largest Market
254 counties, April 15 deadline, mandatory filing with real penalties. Start marketing and testing here.

## Pricing Reference

| | Starter | Professional | Firm |
|---|---------|-------------|------|
| Price | $29/mo ($290/yr) | $79/mo ($790/yr) | $149/mo ($1,490/yr) |
| Users | 1 | Up to 5 | Unlimited |
| Clients | Up to 25 | Unlimited | Unlimited |
| States | TX, OK, FL | All supported | All supported |
| Import | CSV/Excel | CSV + QuickBooks/Sage/Xero (v2) | All + API access |
| Extras | — | Deadline reminders | Client portal, custom branding |

---

## How to Use This Prompt

**Step 1:** Start a new conversation. Paste this entire document.

**Step 2:** Say: "Let's begin Phase 1. Set up the project scaffolding with Next.js, NestJS, Drizzle ORM, and Supabase. Create the database schema for all entities listed in the data model."

**Step 3:** Work through each phase sequentially. At each step, ask for specific components:
- "Build the client CRUD API endpoints and the frontend data grid"
- "Build the CSV import flow with column mapping"
- "Build the depreciation calculation engine"
- "Build the PDF generation pipeline with Puppeteer"
- etc.

**Step 4:** After each major component, test and iterate before moving on.

**Step 5:** When Phase 4 is complete, you have an MVP ready for alpha testing with real CPAs.
