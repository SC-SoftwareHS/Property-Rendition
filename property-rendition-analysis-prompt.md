# Property Rendition — Strategic Analysis Prompt

Use this prompt in Cowork or Claude Code with the Property-Rendition repo connected.

---

## The Prompt

```
You are acting as three roles simultaneously for this analysis:

### Role 1: Career Coach
I'm a solo bootstrapped entrepreneur with limited time and a tendency toward shiny object syndrome. I built this product in ~2 days. I need honest, direct feedback on whether this product is worth my full-time focus for the next 90 days. Don't sugarcoat — if there are red flags, tell me.

### Role 2: Senior Product Engineer
Do a thorough technical audit of this codebase. I need to understand:

**Architecture & Stack:**
- What is the tech stack (framework, database, hosting, auth)?
- Is this a monorepo? What's in the apps/ directory?
- How is the project structured? Is it clean or does it need refactoring?
- What's the deployment story — is this ready for production or still dev-mode?

**Feature Completeness:**
- Walk through every user-facing feature you can identify from the code
- For each feature, rate it: [Complete] [Partially Built] [Stubbed/Placeholder] [Missing]
- Specifically check for:
  - Business personal property rendition forms for Texas (Form 50-144), Oklahoma (Form 901), and Florida (DR-405)
  - Asset management (add/edit/delete assets, depreciation calculations)
  - Client management (multi-client support for CPA firms)
  - County-specific form generation/output
  - PDF generation or print functionality
  - User authentication and multi-user support
  - Payment/subscription (Stripe or similar)
  - Data import (CSV, from other accounting software)
  - Data export (PDF, CSV, print-ready forms)

**Code Quality:**
- Are there any obvious bugs, security issues, or missing error handling?
- Is the code production-ready or does it need hardening?
- What are the top 5 things that need fixing before a paying customer uses this?

### Role 3: Competitive Strategist
The primary competitor is **Personal Property Pro** (personalpropertypro.com). Here's what I know about them:

**Their product:**
- Desktop-only Windows software (downloadable .exe installer)
- Uses legacy Microsoft Access databases (.mdb files)
- Covers all 398 counties across Texas, Oklahoma, and Florida
- Has been around since at least 2007
- Revenue estimated ~$150K/year
- Phone-based support out of Tulsa, OK area (918 area code)
- Pricing: starts at $195/year for CPA firms, separate pricing for corporations/franchises
- Key features: county-specific form generation, asset depreciation tables, PDF output, client management, import from popular tax software, administrative passwords per client
- No cloud access, no modern UX, no API, no mobile access
- Their website looks like it hasn't been updated since 2010

**My planned pricing (RenditionReady):**
- Starter: $29/month ($290/year) — 1 user, up to 25 clients, 3 states
- Professional: $79/month ($790/year) — up to 5 users, unlimited clients, integrations, deadline reminders
- Firm: $149/month ($1,490/year) — unlimited users, client portal, API, custom branding

**Based on the codebase analysis, answer:**
1. What features does my product have that the competitor doesn't? (Cloud access, modern UX, etc.)
2. What features does the competitor have that I'm missing or haven't fully built?
3. What are the critical "table stakes" features a CPA firm would need before switching from PPP to my product? Which of those are complete vs. incomplete in the code?
4. How many weeks of focused development would it take to get this product to a state where I could confidently sell it to 10 CPA firms?
5. What's the single highest-impact feature I should finish first?

### Output Format
Structure your response as:

1. **Executive Summary** (3-5 bullet points — is this worth my time?)
2. **Technical Architecture Overview** (stack, structure, deployment readiness)
3. **Feature Audit Table** (every feature, status, priority to complete)
4. **Competitive Gap Analysis** (what I have vs. what PPP has vs. what neither has)
5. **Critical Path to First 10 Customers** (ordered list of exactly what to build/fix, with time estimates)
6. **Honest Assessment** (career coach hat — should I go all-in on this for 90 days, or is there a reason to hesitate?)
```

---

## Follow-Up Prompts

After the initial analysis, use these to go deeper:

### Prompt 2: Go-to-Market Readiness
```
Based on your analysis of the codebase, create a checklist of everything that needs to happen before I can start selling this product. Categorize into:
- [BLOCKER] Cannot sell without this
- [IMPORTANT] Should have for credibility but not a dealbreaker
- [NICE TO HAVE] Can add after first customers

For each BLOCKER item, estimate hours to complete and flag any that require external dependencies (APIs, county data, legal review, etc.)
```

### Prompt 3: County Form Accuracy Audit
```
This is a compliance product — accuracy is everything. Audit the form generation logic for each state:
- Texas Form 50-144: Does the code correctly map all required fields? Are depreciation schedules calculated correctly? Does it handle county-specific variations?
- Oklahoma Form 901: Same questions.
- Florida DR-405: Same questions.

Flag any fields that appear hardcoded, placeholder, or potentially incorrect. A CPA filing an inaccurate rendition could face penalties, so this is the highest-risk area of the product.
```

### Prompt 4: Pricing & Positioning Teardown
```
Review any pricing, landing page, or marketing copy in the codebase. Based on the feature set that actually exists (not what's planned), answer:
- Is the Starter tier ($29/mo) justified by what's currently built?
- What would a CPA firm expect at the Professional tier ($79/mo) that might not be ready yet?
- Is there anything in the code that suggests features are promised but not delivered (UI elements that don't work, pages that are stubbed out)?

Recommend which tier I should launch with first and what the minimum feature set needs to be for that tier.
```

### Prompt 5: 2-Week Sprint Plan
```
Given everything you've found, create a detailed 2-week sprint plan assuming I'm working full-time (8 hours/day). Each day should have:
- Specific tasks with estimated hours
- Which files/components to work on
- Definition of done for each task
- Priority order (if I run out of time, what gets cut?)

Goal: At the end of 2 weeks, I should be able to demo this product to a CPA firm and take their money.
```
