# RenditionReady — Companion Reference

## Appendix A: Texas Form Specifications

### Form 50-144 (Standard BPP Rendition — used by ~240 of 254 counties)
- **Sections:** Property owner info, agent info (if applicable), property location/account, asset schedule (assets grouped by category and year acquired), totals
- **Asset categories on form:** Furniture/Fixtures, Machinery/Equipment, Computer Equipment, Leasehold Improvements, Vehicles, Inventory (avg monthly), Supplies, Other
- **Columns per category:** Year Acquired, Original Cost, Good Faith Estimate of Market Value
- **Signature:** Under oath, penalty of perjury
- **Deadline:** April 15 (extensions available to May 15)

### Harris County 22.15-BPP (Houston area — largest TX county)
- Same data as 50-144 but different layout
- Adds: asset cost totals by category AND by year in a cross-tab format
- Requires separate pages for leased equipment detail
- Account number format: specific to HCAD

### Tarrant County P1/P2 (Fort Worth area)
- **P1:** Property info and summary totals
- **P2:** Detailed asset listing with **percent-good calculations**
- Percent-good = depreciation expressed as a percentage of original cost remaining
- Tarrant publishes their own percent-good tables annually

### Dallas County Custom Format
- Similar to 50-144 but with Dallas CAD-specific header and formatting
- Includes additional fields for business type classification

### Other Texas Considerations
- **Appointment of Agent (Form 50-162):** Required if a CPA or agent files on behalf of the property owner
- **Notice of Protest (Form 50-132):** Used to protest assessed values after the appraisal district responds
- **Extension Request:** Written request to chief appraiser, extends deadline 15 days

## Appendix B: Oklahoma Form Specifications

### Form 901 (Standard BPP Rendition)
- **Sections:** Taxpayer info, property description/location, asset schedule
- **Asset categories:** Furniture/Fixtures, Machinery/Equipment, Computer Equipment, Leasehold Improvements, Vehicles, Inventory, Supplies, Leased Equipment
- **Columns:** Description, Year Acquired, Original Cost
- **Deadline:** March 15 (Oklahoma)
- **Penalty:** Failure to render = county assessor estimates value (usually higher)

### Form 901-P (Petroleum Related)
- Specialized for oil/gas equipment, well equipment, pipelines
- Additional categories for drilling equipment, production equipment, gathering systems

### Form 901-F (Freeport Exemption)
- For inventory that qualifies for Oklahoma's freeport exemption
- Requires monthly inventory averaging calculations
- Must show inventory present on Jan 1 and prove it was shipped out of state within specific timeframe

### Oklahoma County Custom Format
- Oklahoma County (OKC metro) uses a modified Page 1 with additional reporting fields
- Rest of form follows standard 901 format

## Appendix C: Florida Form Specifications

### DR-405 (Tangible Personal Property Tax Return)
- **Filing deadline:** April 1
- **Categories:** Similar to TX/OK but Florida-specific groupings
- **Key difference:** Florida requires reporting of ALL tangible personal property including items already fully depreciated
- **Sections:** Property owner info, physical location, asset listing by category/year, prior year comparison
- **Penalty:** 25% of total tax for late filing; 25% for failure to file

### DR-405EZ (Short Form)
- Simplified version for businesses with total assets under $25,000
- Single-page format
- Many small businesses qualify for this

## Appendix D: Depreciation Research Guide

### How BPP Depreciation Works (vs. IRS)

IRS depreciation (MACRS) is used for income tax purposes. BPP depreciation is completely different — it's used by county appraisal districts to estimate the current market value of business assets for property tax purposes.

Key differences:
- **Different useful lives:** A computer might have 5-year MACRS life but 3-year BPP life
- **Different methods:** BPP often uses percent-good tables, not straight-line or declining balance
- **Floor values:** Most jurisdictions set a minimum value (e.g., 10-20% of original cost) — assets never depreciate to zero
- **Jurisdiction-specific:** Each county can (and many do) set their own schedules
- **Updated annually:** Schedules can change year to year

### Where to Find Depreciation Schedules

**Texas:**
- Each county's Central Appraisal District (CAD) website
- Look for "Business Personal Property" or "BPP" section
- Harris CAD: hcad.org → Industrial/Personal Property → Depreciation Schedules
- Dallas CAD: dallascad.org → Forms → BPP
- Tarrant CAD: tad.org → Forms & Applications → Percent Good Tables
- Texas Comptroller publishes general guidelines but counties can deviate
- Key resource: Texas Comptroller's Property Tax Assistance Division

**Oklahoma:**
- County assessor offices publish schedules
- Oklahoma Tax Commission provides baseline schedules
- OTC website: oklahoma.gov/tax → Ad Valorem → Forms
- Tulsa County and Oklahoma County have their own published schedules

**Florida:**
- County Property Appraiser offices
- Florida Department of Revenue publishes standard schedules
- DOR website: floridarevenue.com → Property Tax → Tangible Personal Property
- Large counties (Miami-Dade, Broward, Palm Beach, Orange) may have custom schedules

### Typical Depreciation Schedule Structure

Most schedules look like this:

| Asset Age (Years) | Furniture | Equipment | Computers | Vehicles | Leasehold |
|-------------------|-----------|-----------|-----------|----------|-----------|
| 1 (new) | 90% | 85% | 75% | 85% | 90% |
| 2 | 75% | 70% | 50% | 70% | 80% |
| 3 | 60% | 55% | 30% | 55% | 70% |
| 4 | 50% | 45% | 20% | 40% | 60% |
| 5 | 40% | 35% | 15% | 30% | 50% |
| 6+ | 30% | 25% | 10% | 20% | 40% |
| Floor | 20% | 15% | 10% | 10% | 20% |

The percentage = "percent good" = current value as % of original cost.
Depreciated value = Original Cost × Percent Good

**Note:** The above is illustrative only. ALWAYS use the actual published schedule for each jurisdiction.

## Appendix E: States Requiring BPP Renditions (Expansion Roadmap)

### Tier 1 — MVP Launch (3 states)
Texas, Oklahoma, Florida

### Tier 2 — High Priority (next 5, by market size)
Georgia, Virginia, North Carolina, Indiana, Tennessee

### Tier 3 — Medium Priority (next 10)
Alabama, Arizona, Arkansas, Colorado, Kansas, Louisiana, Mississippi, Missouri, South Carolina, West Virginia

### Tier 4 — Remaining (20 states)
California (some counties), Connecticut, Idaho, Illinois (Cook County), Iowa, Kentucky, Maine, Maryland, Massachusetts, Michigan, Minnesota, Montana, Nebraska, Nevada, New Hampshire, Ohio, Oregon, Rhode Island, Utah, Vermont, Washington D.C.

**Note:** Some states have partial or conditional BPP requirements (e.g., California only in certain counties, Michigan has a personal property tax phase-out in progress). Research current status for each before building.

## Appendix F: Key Deadlines by State (MVP States)

| State | Standard Deadline | Extension Available | Penalty for Late/Non-Filing |
|-------|-------------------|--------------------|-----------------------------|
| Texas | April 15 | May 15 (15 days, by request) | 10% penalty on taxes owed |
| Oklahoma | March 15 | Varies by county | County assessor estimates value |
| Florida | April 1 | 30 days (by request, with $5K+ penalty if late) | 25% of total tax |

## Appendix G: Competitive Landscape Beyond PPP

### Enterprise Tier ($10K–$100K+/year)
- **Avalara Property Tax** — Launched 2023. Cloud-based. Targets mid-market and enterprise. Research found 37% of companies use any PT software.
- **Ryan / ONESOURCE Property Tax** — Thomson Reuters product. Full-service property tax compliance for Fortune 500.
- **Rethink Solutions (PTMS/itamlink)** — Canadian-origin, serves large US companies.

### Adjacent / Partial Competitors
- **Excel/Google Sheets** — The actual competitor for 63% of the market. Free but massively time-consuming.
- **Fixed asset management software** (Sage Fixed Assets, Bloomberg Tax Fixed Assets) — Tracks assets for income tax depreciation but does NOT generate BPP rendition forms.
- **County e-filing systems** — Some counties (Harris County iFile) offer direct electronic filing, but these are county-specific, not a multi-jurisdiction solution.

### Why None of These Are a Real Threat
- Enterprise solutions price out 95% of the market
- Excel is "free" but costs 20–40 hours of CPA time per season
- Fixed asset software doesn't generate rendition forms
- County e-filing is fragmented (one county at a time)

**RenditionReady sits in the gap:** affordable ($29–$149/mo), cloud-native, multi-jurisdiction, and actually generates the forms.
