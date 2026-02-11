# RenditionReady — Master Build Prompt

> **How to use this prompt:** Copy this entire document into a new conversation with Claude (or any AI coding assistant like Cursor, Windsurf, etc.). It contains everything needed to build the product from scratch. For best results, work through it phase by phase — don't ask for everything at once. Start with "Let's begin Phase 1" and iterate.

---

## System Context

You are a senior full-stack engineer building **RenditionReady**, a cloud-native SaaS platform that automates business personal property (BPP) tax rendition preparation. This is a greenfield project. You will build it phase by phase, starting with the data foundation and ending with a launch-ready product.

## What This Product Does

Every business that owns tangible assets (furniture, equipment, computers, vehicles, inventory) in **38 U.S. states plus Washington D.C.** must file an annual "rendition" form with their county appraisal district, reporting those assets and their depreciated values by a fixed deadline (April 15 in Texas). Failure to file triggers a **10% penalty** on total taxes owed; filing a false report incurs a **50% penalty**.

The current workflow for CPAs and businesses is entirely manual: download county-specific PDF forms, pull asset data from accounting software or spreadsheets, look up jurisdiction-specific depreciation schedules (which differ from IRS/GAAP depreciation), hand-calculate depreciated values, fill out each form by hand, print and mail. A single rendition takes **30–40 minutes**. A mid-size CPA firm handling 70 clients does this hundreds of times every spring.

**RenditionReady automates this entire workflow.** Users enter client and asset data once, and the system generates print-ready, county-specific rendition forms with correct depreciation calculations. Data rolls forward year-to-year, so subsequent years are incremental updates only.

## Competitive Intelligence

The only direct competitor at this price point is **Personal Property Pro (PPP)** by TorqueWare, Inc.:
- 20-year-old Windows desktop application built by a one-person company
- Built on **Visual Basic 6.0 + Microsoft Access (.mdb) + Crystal Reports**
- Desktop-only with no cloud capability
- Covers only **3 of 38 states** (Texas, Oklahoma, Florida — 398 counties total)
- Explicitly prohibits data export beyond PDF
- No API and no documented third-party integrations beyond asset import
- No deadline tracking and no electronic filing
- Single-developer business continuity risk
- Virtually zero independent user reviews on major platforms
- Only 37% of companies use ANY property tax software — 63% file manually

**Our advantages:** Cloud-native, full data export, multi-state, integrations, modern UX, team-maintained.

## Target Users

1. **Regional CPA firms** (primary): 5–20 person firms handling 50–300 renditions/year across 1–3 states. Value speed, accuracy, multi-client management, and year-over-year rollover. Price-sensitive but willing to pay for significant time savings.
2. **Multi-location businesses** (secondary): Retail chains, franchise operators with 10–100 locations. Need centralized asset management and deadline tracking.
3. **Solo practitioners / small business owners**: Filing 1–10 renditions/year. Want simplicity above all. Extremely price-sensitive.

## Suggested Architecture

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | **Next.js** (React 18, TypeScript) | SSR, performance, routing |
| UI | **Shadcn/ui + Tailwind CSS** | Accessible Radix primitives, rapid iteration |
| Data tables | **TanStack Table** | High-perf grids with sort, filter, inline edit |
| State | **TanStack Query + Zustand** | Server state caching + minimal client state |
| Backend | **Node.js / NestJS** (TypeScript) | Structured modules, DI, testability |
| API style | **REST + OpenAPI** (GraphQL considered for v2) | Clear contracts, tooling |
| Auth | **Clerk or Auth0** | Managed auth with MFA, SSO, RBAC |
| Database | **PostgreSQL 16** on AWS RDS or Supabase | Relational integrity |
| ORM | **Drizzle ORM or Prisma** | Type-safe schema + migrations |
| Cache/Queue | **Redis + BullMQ** | Jobs, caching, batch ops |
| PDF engine | **Puppeteer** (server-side) | Pixel-perfect form output |
| PDF preview | **React-PDF** (client-side) | In-browser preview |
| File storage | **AWS S3** | PDFs, imports, templates |
| Hosting | **AWS (ECS Fargate)** or **Vercel + AWS Lambda** | Scalable deployment |
| CI/CD | **GitHub Actions** | Automated test/lint/deploy |
| Monitoring | **Datadog or CloudWatch + Sentry** | APM + error tracking |
| CDN | **CloudFront** | Static assets + PDF delivery |

## Data Model Sketch

### Core Entities

**Firm** → the accounting firm or business entity using the platform. Fields: firm name, primary contact, subscription tier, billing info. Has many Users and Clients.

**User** → individual practitioners within a firm. Fields: name, email, role (Admin/Preparer/Reviewer), MFA status. Belongs to one Firm. Can access many Clients.

**Client** → a business entity for which renditions are prepared. Fields: company name, EIN, contact info, industry type. Belongs to one Firm. Has many Locations and Assets.

**Location** → a physical situs where a client's property resides. Fields: address, county, state, appraisal district ID, account number. Belongs to one Client. Each Location maps to one Jurisdiction. Has many Assets.

**Asset** → an individual item or category of tangible personal property. Fields: description, category (enum), original cost, acquisition date, disposal date, quantity, location_id, is_leased, lessor_info. Belongs to one Location. Versioned by TaxYear (an asset snapshot is created per tax year via rollover).

**Rendition** → a generated filing for a specific Client + Location + TaxYear combination. Fields: tax_year, jurisdiction_id, form_type, status (enum: not_started/in_progress/ready_for_review/approved/filed), generated_pdf_url, filed_date, preparer_id, reviewer_id. Belongs to one Client and one Location. Contains calculated totals derived from Assets.

### Supporting Entities

**Jurisdiction** (state, county, form templates, depreciation schedules, deadlines)

**DepreciationSchedule** (jurisdiction_id, asset_category, useful_life, annual_factors)

**TaxYear** (year, rollover_source_year)

**AuditLog** (entity, field, old_value, new_value, changed_by, timestamp)

### Key Relationships

A Client has many Locations; each Location is in one Jurisdiction; Assets belong to Locations and are versioned per TaxYear; Renditions are generated per Location per TaxYear; DepreciationSchedules belong to Jurisdictions and are keyed by asset category.

### Data Isolation and Performance Notes

- Use row-level security for multi-tenant isolation by firm_id.
- Partition by tax_year for historical query performance.

## Build Phases

### Phase 1: Foundation & Data Engine (Weeks 1–6)

**What ships:** Authentication, firm/user management, client CRUD, location management, asset database with CSV/Excel import, and the core data model in PostgreSQL.

**Key deliverables:** User registration and login with MFA. Firm setup wizard. Client creation with company details and EIN. Location management with county/state assignment. Asset entry form with all required fields (description, category, cost, acquisition date). Bulk CSV/Excel import with column mapping UI. Asset listing with sort, filter, and search. Database schema with all core entities, migrations, and seed data for jurisdiction/depreciation tables.

**Definition of done:** A user can sign up, create a firm, add clients with locations, import 500+ assets via CSV, and view/edit/delete them. All data persists correctly across sessions.

### Phase 2: Depreciation Engine & Form Generation (Weeks 7–14)

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
   - Store results for PDF generation

4. **Form templates (HTML/CSS):** Create pixel-accurate HTML templates for:
   - Texas Form 50-144 (standard — covers most counties)
   - Harris County 22.15-BPP variant
   - Tarrant County P1/P2 variant
   - Dallas County custom variant
   - Oklahoma Form 901
   - Oklahoma Form 901-F (freeport)
   - Florida DR-405
   - Florida DR-405EZ
   Each template has a corresponding field mapping that maps Rendition data to template positions.

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

**Definition of done:** A user can select a client, click "Generate Renditions," and receive print-ready PDFs that match the official county forms with correct asset totals, depreciation calculations, and category breakdowns for any county in Texas, Oklahoma, or Florida.

### Phase 3: Year-Over-Year Rollover & Workflow (Weeks 15–18)

**What ships:** Tax year rollover, rendition status tracking, dashboard, and the complete prepare → review → approve → file workflow.

**Key deliverables:** One-click "Roll to Tax Year 2027" that copies all active assets forward, preserving disposed/added asset history. Tax year selector for viewing any year's data. Rendition status workflow (Not Started → In Progress → Ready for Review → Approved → Filed) with status visible on the dashboard. Dashboard showing all clients, their filing status, and completion percentage. Client-level "Mark Complete" with timestamp. Batch status updates.

**Definition of done:** A returning user can roll their entire client base to a new tax year in one click, make incremental asset changes, regenerate renditions, track progress through the review workflow, and see a dashboard summary of all filing activity.

### Phase 4: Data Export, Polish & Launch Prep (Weeks 19–22)

**What ships:** Full data export (CSV/Excel/JSON), user roles and permissions, firm settings, billing integration, landing page, documentation, and client report generation.

**Key deliverables:** Export any data set (clients, assets, renditions, reports) to CSV, Excel, or JSON with no restrictions. Role-based access control (Admin can manage users and billing; Preparer can create/edit; Reviewer can approve). Firm settings (logo upload for branded PDF output, default preferences). Stripe billing integration with subscription tiers. Marketing landing page. Help documentation and onboarding guide. Client report generation (matching PPP's Client Report functionality). Error handling, input validation, and edge-case hardening across all flows.

**Definition of done:** The product is ready for paying customers. A new user can sign up, choose a plan, enter payment, and begin preparing renditions within 15 minutes. All data is exportable. Roles and permissions work correctly. Billing cycles automatically.

## Important Implementation Notes

### Form Template Accuracy Is the Highest Risk

County assessors must accept our output. Every form must be visually indistinguishable from the official county form. Budget extra QA time for visual comparison against official forms and validate with CPA alpha testers before launch.

### Depreciation Schedule Research Is a Significant Task

Each county's appraisal district publishes its own schedule, often as PDFs. Budget 1–2 weeks just for gathering and validating jurisdiction-specific depreciation tables.

### Jurisdiction-Specific Depreciation ≠ IRS/GAAP Depreciation

Make this distinction clear in the UI with help text to reduce errors in manual workflows.

### Launch Timing Matters

Plan for a **late January or early February** launch to give users 10–12 weeks before the April 15 Texas deadline.

## Pricing Reference

| | Starter | Professional | Firm |
|---|---------|-------------|------|
| Price | $29/mo ($290/yr) | $79/mo ($790/yr) | $149/mo ($1,490/yr) |
| Users | 1 | Up to 5 | Unlimited |
| Clients | Up to 25 | Unlimited | Unlimited |
| States | TX, OK, FL | All supported | All supported |
| Import | CSV/Excel | CSV + QuickBooks/Sage/Xero (v2) | All + API access |
| Extras | — | Deadline reminders | Client portal, custom branding |

A **14-day free trial** with full feature access (no credit card required) replaces PPP's two-year-old-demo approach. An annual billing discount of ~20% encourages commitment.

---

## How to Use This Prompt

**Step 1:** Start a new conversation. Paste this entire document.

**Step 2:** Say: "Let's begin Phase 1. Set up the project scaffolding with Next.js, NestJS, a Postgres database (AWS RDS or Supabase), and a type-safe ORM (Drizzle or Prisma). Create the database schema for all entities listed in the data model."

**Step 3:** Work through each phase sequentially. At each step, ask for specific components:
- "Build the client CRUD API endpoints and the frontend data grid"
- "Build the CSV import flow with column mapping"
- "Build the depreciation calculation engine"
- "Build the PDF generation pipeline with Puppeteer"
- etc.

**Step 4:** After each major component, test and iterate before moving on.

**Step 5:** When Phase 4 is complete, you have an MVP ready for alpha testing with real CPAs.
