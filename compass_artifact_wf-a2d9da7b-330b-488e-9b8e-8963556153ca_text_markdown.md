# Personal Property Pro: Full product teardown and competitive rebuild plan

**Personal Property Pro (PPP) is a 20-year-old Windows desktop application built by a one-person company that automates business personal property tax rendition preparation across Texas, Oklahoma, and Florida.** It reduces a 30–40 minute per-form manual task to minutes for CPAs and business owners, starting at **$195/year**. Despite its longevity and niche dominance, PPP runs on Visual Basic 6 and Microsoft Access, has zero cloud capability, locks users out of their own data exports, and covers only 3 of 38 states that require renditions. With only 37% of companies using any property tax software at all, the market represents a massive opportunity for a modern, cloud-native competitor.

---

# Phase 1 — Deep product audit

## The rendition problem PPP solves and who pays for it

Business personal property (BPP) tax renditions are mandatory annual filings required in **38 states plus Washington D.C.** Every business owning tangible assets — furniture, equipment, computers, vehicles, inventory — must report those assets to their local county appraisal district by a fixed deadline (April 15 in Texas). Failure to file triggers a **10% penalty** on total taxes owed; filing a false report incurs a **50% penalty**.

The traditional workflow is brutal: a CPA or business owner downloads county-specific forms, manually pulls asset data from accounting software or spreadsheets, looks up jurisdiction-specific depreciation schedules (which differ from IRS/GAAP depreciation), hand-calculates depreciated values, fills out each form by hand, and mails them. A single rendition takes **30–40 minutes** to complete manually. A mid-size CPA firm handling 70 clients does this hundreds of times every spring.

PPP automates this exact workflow. It stores client and asset data in a local database, auto-fills county-specific forms with the correct calculations, and prints or saves PDF renditions. Its core users fall into two personas: **CPA/accounting firms** preparing renditions for multiple clients (the primary market), and **corporations/franchises** filing their own renditions across multiple counties. The one independent testimonial ever published — a 2005 Tulsa World article — quotes CPA Glenn Eddleman of Glenn Elliott and Associates: *"We've already used it quite a bit. It saves us a ton of time."*

The product is developed by **TorqueWare, Inc.**, a micro-company in Tulsa, Oklahoma founded in 1995 by Doug Torkelson. Per Dun & Bradstreet data, TorqueWare has **2 employees** and approximately **$150,000 in annual revenue**. Torkelson is the sole developer, with a background in Visual Basic client/server development dating to the late 1980s, including work on a 1040 tax system used by thousands of CPA firms.

## Complete feature inventory

### Core rendition features

PPP supports all **398 counties** across three states with state-approved forms:

**Oklahoma (77 counties):** Form 901 (Business Personal Property Rendition), Form 901-P (Petroleum Related), Form 901-F (Freeport Exemption), Form 901-IP (Instructions), Form 904-3A, plus Oklahoma County's custom Page 1 format.

**Texas (254 counties):** Form 50-144 (standard BPP rendition, approved by the Texas Comptroller's Office), Appointment of Agent form (50-162), Notice of Protest form (50-132), Mixed-Use Vehicle Exemption form, Extension Request form. County-specific variants include Harris County's 22.15-BPP with asset cost totals by category and year, Dallas County's custom return format, and Tarrant County's P1/P2 with percent-good calculations.

**Florida (67 counties):** Form DR-405 (Tangible Personal Property Tax Return) and DR-405EZ.

Core calculation capabilities include automated depreciation using jurisdiction-specific schedules, asset cost totals by category and year, percent-good calculations (Tarrant County format), monthly inventory averaging for Oklahoma freeport exemptions, and asset cross-tab summaries.

### Client and asset management

The software maintains a local client database with company name, contact info, client ID, and a "Complete" flag with completion date. Individual per-client passwords prevent unauthorized editing, previewing, or printing, with an administrative master password that overrides all client passwords. Sample clients ship with the program for testing during evaluation.

Asset management allows entry by category (furniture/fixtures, equipment, machinery, computers, inventory, raw materials) and year acquired, with original cost tracking. **Year-over-year data rollover** is automatic — client data persists across annual version upgrades in a `_~private\` folder, and uninstalling the software explicitly does not delete data files.

### Import, export, and integrations

PPP imports assets from "most popular tax and asset software packages," though specific supported formats are not publicly documented. Output is limited to **printing and PDF generation only**. The license agreement explicitly prohibits data export: *"Neither TorqueWare nor the SOFTWARE provides any services or utilities for exporting, extracting or dumping your data... to any external file format other than PDF files."* No API exists. No third-party integrations exist beyond the asset import capability.

### Reporting and output

Available reports include Asset Cross-tab Summary, Asset Listing, and Client Report (company, name, phone, client ID, completion status). All rendition forms and reports can be printed to paper or saved as PDF for client approval and electronic archiving.

### Administration and deployment

PPP offers single-user desktop and multi-user network license options. The network configuration involves a server installation plus a workstation configuration program. The software supports Windows 7/8/10 and Windows Server 2008 through 2025. Database operations include manual backup, restore, and compact functions. Registration is email-based and tied to a specific computer via Location ID tracking.

### Billing and subscription

The licensing model is annual, tied to the tax year. Two pricing tiers exist: a lower-priced **CPA/Accounting/Enrolled Agent** tier for firms primarily preparing renditions for unaffiliated clients, and a higher-priced **Corporation/Partnership/Franchise** tier for businesses filing their own renditions. Pricing starts at **$195** (per a 2011 CPA Practice Advisor listing) and ranges up to approximately **$750** depending on tier and volume. A free tier historically existed for businesses with 15 or fewer assets. The free demo is the full application with the tax year rolled back two years and a "DEMO" watermark on all output. There is **no refund policy** — the try-before-you-buy model is the only recourse.

## How users experience the product end to end

**Discovery and trial:** A prospective user visits personalpropertypro.com and clicks "Download the Free Demo." They receive the full current application with the tax year rolled back two years. All forms and reports print with a "DEMO" watermark. This allows complete evaluation of every feature before purchase.

**Purchase and registration:** The user selects either the CPA or Corporate plan on the purchase page. After TorqueWare processes the license, the user opens PPP, navigates to Help → Register, and enters their registered email address. Registration activates the license for the current tax year and version.

**Data entry and rendition preparation:** The user creates clients with company information, owner details, and property locations. Assets are entered manually or imported from tax/asset software, assigned to categories and acquisition years. The software auto-calculates values and populates the correct county-specific forms. The user previews, prints, or saves the rendition as PDF, then marks the client as "Complete."

**Year-over-year workflow:** When a new tax year begins, the user downloads and installs the annual update (e.g., PPP2024-Program.exe). All client data carries forward automatically. The user re-registers with their email to activate the new license, then makes incremental changes — adding new assets, removing disposed ones, updating values. The annual version progression follows a simple pattern: version 14 for tax year 2018, version 16 for 2020, up to version 20 for 2024.

## Technology under the hood

PPP is built on a **Visual Basic 6.0** codebase with **Microsoft Access (.mdb)** database files, using **Crystal Reports** for form generation and printing. The license agreement references specific database files (`dbData.mdb` and `dbCoSetup.mdb`) stored in a `_~private\` subdirectory. Data access uses ADO/ODBC. The software contacts a remote PPP web server for license registration verification, software update checks, and rule set updates.

The website itself is built with **Microsoft FrontPage 2003**, using static `.htm` pages and a few Classic ASP (`.asp`) pages for upgrade processing. The site uses HTML frames — a web technology largely abandoned by the mid-2000s. No analytics, tracking pixels, or modern marketing infrastructure is present. There is no GitHub presence, no public API documentation, and no evidence of modern development practices.

The version history shows continuous annual releases from at least version 9.0 (2013) through version 20.0 (January 16, 2024, for tax year 2024). The supported Windows Server versions include Server 2025, confirming ongoing maintenance.

## What users say — and what the silence reveals

After exhaustive searching across G2, Capterra, TrustPilot, GetApp, Software Advice, Google Reviews, Reddit, Twitter/X, LinkedIn, Facebook, accounting forums, and property tax communities, **virtually zero independent user reviews exist** for Personal Property Pro. The product has no listing on any major software review platform. The only independent testimonial is from a 2005 Tulsa World newspaper article — now over 20 years old.

This near-total absence of online presence is itself the most significant finding. Several factors explain it: the product serves an extremely narrow niche (BPP renditions in 3 states), its user base of CPAs and tax preparers in Oklahoma and Texas is not particularly active on software review platforms, and the product predates the modern review ecosystem. TorqueWare has no social media presence, no blog, and no community engagement.

### Top weaknesses and pain points (inferred from product analysis)

Since direct user complaints are unavailable, the following weaknesses are inferred from the product's feature set, license terms, and competitive positioning:

1. **Desktop-only, no cloud access.** Users cannot access their data from different machines, collaborate with colleagues, or work remotely without VPN access to the installed machine. In a post-COVID world where remote work is standard, this is a critical limitation.

2. **Data lock-in by design.** The license agreement explicitly prohibits data export beyond PDF. Users cannot extract their asset data to CSV, Excel, or any other format. Switching away from PPP means manually re-entering all client and asset data into a new system.

3. **Three-state coverage only.** With 38 states requiring BPP renditions, PPP covers less than 8% of the addressable market. Firms with clients in Georgia, California, or any other state need a separate solution.

4. **No integrations or API.** Beyond the opaque "import from popular tax software" capability, there is no documented integration with QuickBooks, Sage, SAP, or any ERP/accounting system. No API exists for automation or custom workflows.

5. **Single-developer risk.** The entire product depends on one person. If Doug Torkelson becomes unavailable, there is no documented succession plan, no open codebase, and no team to maintain or update the software. Annual form changes from state comptroller offices would go unaddressed.

6. **Antiquated technology.** VB6 reached end of mainstream support in 2008. Microsoft Access databases are not designed for concurrent multi-user access at scale. The frames-based website signals a product frozen in a pre-modern era.

7. **No electronic filing.** Some counties (notably Harris County, Texas) now support electronic filing (iFile). PPP generates forms for printing and mailing only.

8. **No deadline management.** The software does not track filing deadlines, send reminders, or manage the calendar complexity of multi-jurisdiction compliance.

---

# Phase 2 — Competitive rebuild specification (PRD)

## Product vision

**RenditionReady** is a cloud-native SaaS platform that automates business personal property tax rendition preparation for CPAs, accounting firms, and multi-location businesses across all 38 states requiring BPP filings. It replaces manual spreadsheet workflows and legacy desktop software with a modern, collaborative, integration-rich platform that handles the full rendition lifecycle — from asset ingestion through form generation, review, and filing.

### Problem statement

Property tax rendition preparation remains one of the last un-digitized corners of tax compliance. Enterprise companies spend **132 hours per week** on personal property tax tasks. Only **37% of companies** use any property tax software. The existing market is polarized: affordable but antiquated desktop tools like Personal Property Pro serve the low end, while enterprise platforms like Avalara and Ryan/ONESOURCE cost tens of thousands annually and target Fortune 500 companies. **No modern, cloud-native, affordably-priced solution exists for the 5–500 rendition segment** — the "missing middle" of CPAs, mid-size accounting firms, and regional businesses.

### The five complaints RenditionReady specifically addresses

| PPP weakness | RenditionReady solution |
|---|---|
| Desktop-only, no cloud access | Cloud-native SaaS accessible from any browser, any device |
| Data export locked by license terms | Full CSV/Excel/JSON export of all data at any time; no lock-in |
| Only 3 states covered | Launch with all 38 BPP-required states; form library updated annually |
| No integrations or API | QuickBooks, Sage, Xero integrations; RESTful API; CSV/Excel import |
| Single-developer business continuity risk | Modern architecture, documented codebase, team-maintained |

## Target user personas

**Persona 1 — Regional CPA firm (primary).** A 5–20 person CPA firm handling 50–300 renditions per year across 1–3 states. Currently uses PPP, Excel, or paper forms. Values speed, accuracy, multi-client management, and year-over-year rollover. Price-sensitive but willing to pay for significant time savings. The managing partner cares about reducing seasonal crunch and minimizing errors that trigger client complaints.

**Persona 2 — Multi-location business (secondary).** A retail chain, franchise operator, or regional manufacturer with 10–100 locations across multiple counties and states. The in-house controller or tax manager currently assembles renditions in Excel, pulling data from QuickBooks or an ERP. Needs automated form selection by jurisdiction, centralized asset management, and deadline tracking.

**Persona 3 — Solo practitioner or small business owner.** A one-person CPA practice or small business owner filing 1–10 renditions per year. Wants the simplest possible experience: import assets, generate forms, file and forget. Extremely price-sensitive. May currently be filing by hand.

## Feature specification: MVP versus v2

### MVP features (launch release)

**Asset management engine.** Central asset database with fields for description, category (using standard BPP categories: furniture/fixtures, machinery/equipment, computer equipment, leasehold improvements, vehicles, inventory, supplies, leased equipment), original cost, acquisition date, disposal date, and location (situs address). Bulk import via CSV/Excel upload. Year-over-year rollover with one-click "roll to new tax year" that copies all active assets forward and increments the tax year.

**Client management.** Multi-client workspace with client profiles (company name, EIN, contact info, property locations, filing jurisdictions). Client-level status tracking (Not Started → In Progress → Review → Filed). Client search and filtering.

**Form generation engine.** Jurisdiction-aware form population that selects the correct form based on state and county, fills in asset data with proper categorization and totals, and generates print-ready PDF output matching official form layouts. MVP coverage: **Texas (all 254 counties), Oklahoma (all 77 counties), and Florida (all 67 counties)** — matching PPP's coverage as the baseline, then expanding.

**Depreciation calculator.** Jurisdiction-specific depreciation schedules (not IRS/GAAP) applied automatically by asset category. Support for both historical-cost and good-faith-estimate reporting methods. Percent-good calculations where required (e.g., Tarrant County).

**PDF export and batch printing.** Generate individual rendition PDFs or batch-generate all renditions for a client or all clients. Signature-ready output. Watermark capability for draft/review copies.

**User authentication and access control.** Email/password authentication with MFA. Role-based access: Admin, Preparer, Reviewer. Firm-level account with multiple user seats.

**Data portability.** Full export of all data (clients, assets, renditions) to CSV and Excel at any time, with no restrictions.

**Dashboard.** Overview of all clients, filing status, upcoming deadlines, and completion progress for the current tax year.

### V2 features (post-launch)

**Multi-state expansion.** Add remaining 35 BPP states systematically, prioritized by market size (Georgia, California, Illinois [Chicago only], Virginia, North Carolina, etc.).

**Accounting software integrations.** QuickBooks Online, QuickBooks Desktop, Sage, Xero fixed-asset sync. Pull asset registers directly into RenditionReady, map asset categories to BPP categories, and flag new/disposed assets.

**RESTful API.** Public API for custom integrations, bulk operations, and automation. Webhook support for status change notifications.

**Deadline management.** Jurisdiction-specific deadline calendar with email/SMS reminders. Automatic extension tracking. Visual timeline of upcoming due dates across all clients.

**Electronic filing.** Direct e-filing where supported (Harris County iFile, and any other counties accepting electronic submissions).

**Ghost asset detection.** Flag assets that are fully depreciated beyond useful life, have been on the books for an unusually long period, or match common ghost-asset patterns. Prompt users to verify or dispose.

**Assessment tracking and protest support.** Import Notices of Appraised Value, compare assessed values to rendered values, flag discrepancies, and generate protest forms (Notice of Protest, Form 50-132 in Texas).

**Client portal.** Read-only portal for business-owner clients to review and approve renditions before filing. Digital signature capability.

**Advanced reporting.** Tax liability estimates, year-over-year asset value trends, multi-year depreciation projections, client summary reports, and compliance status dashboards.

**Audit trail.** Complete change log for every asset and rendition — who changed what, when, and why. Critical for audit defense.

## Data model sketch

The core data model centers on six key entities:

**Firm** → the accounting firm or business entity using the platform. Fields: firm name, primary contact, subscription tier, billing info. Has many Users and Clients.

**User** → individual practitioners within a firm. Fields: name, email, role (Admin/Preparer/Reviewer), MFA status. Belongs to one Firm. Can access many Clients.

**Client** → a business entity for which renditions are prepared. Fields: company name, EIN, contact info, industry type. Belongs to one Firm. Has many Locations and Assets.

**Location** → a physical situs where a client's property resides. Fields: address, county, state, appraisal district ID, account number. Belongs to one Client. Each Location maps to one Jurisdiction. Has many Assets.

**Asset** → an individual item or category of tangible personal property. Fields: description, category (enum), original cost, acquisition date, disposal date, quantity, location_id, is_leased, lessor_info. Belongs to one Location. Versioned by TaxYear (an Asset snapshot is created per tax year via rollover).

**Rendition** → a generated filing for a specific Client + Location + TaxYear combination. Fields: tax_year, jurisdiction_id, form_type, status (enum: draft/review/approved/filed), generated_pdf_url, filed_date, preparer_id, reviewer_id. Belongs to one Client and one Location. Contains calculated totals derived from Assets.

Supporting entities include **Jurisdiction** (state, county, form templates, depreciation schedules, deadlines), **DepreciationSchedule** (jurisdiction_id, asset_category, useful_life, annual_factors), **TaxYear** (year, rollover_source_year), and **AuditLog** (entity, field, old_value, new_value, changed_by, timestamp).

Key relationships: a Client has many Locations; each Location is in one Jurisdiction; Assets belong to Locations and are versioned per TaxYear; Renditions are generated per Location per TaxYear; DepreciationSchedules belong to Jurisdictions and are keyed by asset category.

## Suggested architecture

### Frontend

**Framework:** React 18+ with TypeScript and Next.js for server-side rendering and routing. **UI library:** Shadcn/ui (built on Radix primitives) with Tailwind CSS for rapid, accessible component development. **State management:** TanStack Query for server state, Zustand for client state. **PDF rendering:** React-PDF for in-browser preview; server-side PDF generation via Puppeteer or a dedicated PDF microservice for official form output. **Tables:** TanStack Table for high-performance asset grids with sorting, filtering, and inline editing.

### Backend

**Runtime:** Node.js with TypeScript, using the NestJS framework for structured, testable API development. **API style:** RESTful with OpenAPI/Swagger documentation; GraphQL considered for v2 if complex querying needs emerge. **Authentication:** Clerk or Auth0 for managed auth with MFA, SSO, and role-based access control. **Background jobs:** BullMQ with Redis for PDF generation queues, batch operations, and scheduled deadline reminders. **File storage:** AWS S3 for generated PDFs, imported files, and form templates.

### Database

**Primary:** PostgreSQL 16 on AWS RDS or Supabase. Relational integrity is critical for the jurisdiction → depreciation schedule → asset → rendition chain. **Schema strategy:** Row-level security for multi-tenant isolation by firm_id. Partitioning by tax_year for performance on historical queries. **Migrations:** Drizzle ORM or Prisma for type-safe schema management. **Cache:** Redis for session management, job queues, and frequently-accessed jurisdiction data.

### Infrastructure and deployment

**Hosting:** AWS (ECS Fargate for containers, or Vercel for the Next.js frontend + AWS Lambda for backend APIs). **CI/CD:** GitHub Actions for automated testing, linting, and deployment. **Monitoring:** Datadog or AWS CloudWatch for application performance; Sentry for error tracking. **Environments:** Development → Staging → Production with infrastructure-as-code via Terraform or AWS CDK. **CDN:** CloudFront for static assets and PDF delivery.

---

# Phase 3 — Build plan

## Phase 1: Foundation and data engine (weeks 1–6)

**What ships:** Authentication, firm/user management, client CRUD, location management, asset database with CSV/Excel import, and the core data model in PostgreSQL.

**Key deliverables:** User registration and login with MFA. Firm setup wizard. Client creation with company details and EIN. Location management with county/state assignment. Asset entry form with all required fields (description, category, cost, acquisition date). Bulk CSV/Excel import with column mapping UI. Asset listing with sort, filter, and search. Database schema with all core entities, migrations, and seed data for jurisdiction/depreciation tables.

**Definition of done:** A user can sign up, create a firm, add clients with locations, import 500+ assets via CSV, and view/edit/delete them. All data persists correctly across sessions.

**Solo developer estimate:** 6 weeks. **Small team (2–3 devs):** 3–4 weeks (one dev on auth/user management, one on client/asset CRUD and import, one on database schema and API scaffolding).

**Dependencies:** None — this is the foundation.

## Phase 2: Depreciation engine and form generation (weeks 7–14)

**What ships:** Jurisdiction-specific depreciation calculations, form template engine, PDF generation for Texas/Oklahoma/Florida renditions, and print-ready output.

**Key deliverables:** Depreciation schedule database seeded with schedules for all 398 TX/OK/FL counties. Calculation engine that applies correct depreciation by asset category and jurisdiction. Form template system capable of rendering state-specific forms (50-144, 901, DR-405) with county-level variations (Harris, Dallas, Tarrant custom formats). Server-side PDF generation matching official form layouts. Batch PDF generation (all renditions for a client). Draft watermarking. PDF preview in browser.

**Definition of done:** A user can select a client, click "Generate Renditions," and receive print-ready PDFs that match the official county forms with correct asset totals, depreciation calculations, and category breakdowns for any county in Texas, Oklahoma, or Florida.

**Solo developer estimate:** 8 weeks. **Small team:** 5–6 weeks (one dev on depreciation engine and jurisdiction data, one on PDF template rendering, one on form-specific logic and testing across county variants).

**Dependencies:** Phase 1 (assets and client data must exist to generate renditions). The depreciation schedule data collection is a significant research task — budget 1–2 weeks just for gathering and validating jurisdiction-specific depreciation tables.

**Critical note:** Form template accuracy is the single highest-risk item. Each county's form layout must be pixel-accurate. Budget extra QA time for visual comparison against official forms.

## Phase 3: Year-over-year rollover and workflow (weeks 15–18)

**What ships:** Tax year rollover, rendition status tracking, dashboard, and the complete prepare → review → approve → file workflow.

**Key deliverables:** One-click "Roll to Tax Year 2027" that copies all active assets forward, preserving disposed/added asset history. Tax year selector for viewing any year's data. Rendition status workflow (Not Started → In Progress → Ready for Review → Approved → Filed) with status visible on the dashboard. Dashboard showing all clients, their filing status, and completion percentage. Client-level "Mark Complete" with timestamp. Batch status updates.

**Definition of done:** A returning user can roll their entire client base to a new tax year in one click, make incremental asset changes, regenerate renditions, track progress through the review workflow, and see a dashboard summary of all filing activity.

**Solo developer estimate:** 4 weeks. **Small team:** 2–3 weeks.

**Dependencies:** Phases 1 and 2.

## Phase 4: Data export, polish, and launch prep (weeks 19–22)

**What ships:** Full data export (CSV/Excel/JSON), user roles and permissions, firm settings, billing integration, landing page, and documentation.

**Key deliverables:** Export any data set (clients, assets, renditions, reports) to CSV, Excel, or JSON with no restrictions. Role-based access control (Admin can manage users and billing; Preparer can create/edit; Reviewer can approve). Firm settings (logo upload for branded PDF output, default preferences). Stripe billing integration with subscription tiers. Marketing landing page. Help documentation and onboarding guide. Client report generation (matching PPP's Client Report functionality). Error handling, input validation, and edge-case hardening across all flows.

**Definition of done:** The product is ready for paying customers. A new user can sign up, choose a plan, enter payment, and begin preparing renditions within 15 minutes. All data is exportable. Roles and permissions work correctly. Billing cycles automatically.

**Solo developer estimate:** 4 weeks. **Small team:** 3 weeks.

**Dependencies:** Phases 1–3.

## Milestone summary and timeline to first paying customer

| Milestone | Solo developer | Small team (2–3) | Cumulative |
|---|---|---|---|
| Phase 1: Foundation live | Week 6 | Week 4 | Foundation |
| Phase 2: Renditions generating | Week 14 | Week 10 | Core product works |
| Phase 3: Year-over-year workflow | Week 18 | Week 13 | Full workflow complete |
| Phase 4: Launch-ready | Week 22 | Week 16 | First paying customer |
| **Alpha testing with 3–5 CPAs** | Week 15–18 | Week 11–13 | Validation |
| **Public launch** | Week 22 | Week 16 | Revenue begins |

**Recommended launch timing:** Development should be timed so that the product launches by **late January or early February**, giving users 10–12 weeks before the April 15 Texas rendition deadline. This means kickoff should target **mid-September to early October** for a solo developer, or **late October to mid-November** for a small team.

### Pricing strategy to undercut and win

A three-tier SaaS model positions RenditionReady directly against PPP's low-end pricing while capturing more value from larger firms:

- **Starter ($29/month, billed annually at $290/year):** 1 user, up to 25 clients, 3 states (TX/OK/FL). Targets solo practitioners and small businesses. Priced just above PPP's $195 but delivers cloud access, data export, and a modern experience.
- **Professional ($79/month, billed annually at $790/year):** Up to 5 users, unlimited clients, all supported states, accounting software integrations, deadline reminders. Targets regional CPA firms — the core "missing middle" segment.
- **Firm ($149/month, billed annually at $1,490/year):** Unlimited users, client portal, API access, priority support, custom branding. Targets larger firms and multi-location businesses.

A **14-day free trial** with full feature access (no credit card required) replaces PPP's awkward two-year-old-demo approach. An annual billing discount of ~20% encourages commitment.

## What makes this opportunity compelling

The property tax rendition market has a rare combination of characteristics that favor a new entrant. The incumbent (PPP) has **zero switching costs for users** — it prohibits data export, but users rebuild their asset databases annually anyway from accounting records. The technology gap is enormous: VB6 and Access versus modern cloud infrastructure. The market is undertapped at **63% of businesses using no software at all**. And the timing window is predictable — every year, the same pain arrives in January and peaks by April. A product that launches before rendition season with a free trial and modern UX can acquire users during their moment of maximum frustration with manual processes.

The key risk is **form template accuracy**. Property tax rendition software lives or dies on whether its output matches official forms precisely enough that county assessors accept them without question. This is the single area where PPP's 20 years of refinement provides genuine advantage. Budget aggressive QA and early alpha testing with real CPAs to close this gap before public launch.