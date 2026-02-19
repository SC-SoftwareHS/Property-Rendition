Supplemental Prompt: PPP Feature Alignment & Professional Nuances
Instructions for AI: Use the following technical requirements to refine the "RenditionReady" build. These specific features bridge the gap between a basic asset calculator and a professional-grade compliance tool like Personal Property Pro.

1. Enhanced Asset & Value Logic
Manual FMV Overrides: Every asset must have a manual_fmv field. If populated, the system must bypass the depreciation schedule and use this value for all calculations.

Non-Depreciable Categories: Implement specific handling for Inventory, Supplies, Raw Materials, and Finished Goods. By default, Market Value = Cost, but they must still support manual overrides.

Leased & Consigned Property: Create data structures for "Property Managed/Controlled as Fiduciary," "Consigned From Others," and "Consigned To Others." These must be tracked separately as they are reported on specific sections of the Texas 50-144 and Florida DR-405 but are not part of the owner's depreciable basis.

2. Professional Output Pipeline (PDF)
Custom Transmittal Letter: The PDF generation engine must include a "Client Transmittal Letter" as Page 1.

Fields: Address Block, Salutation (e.g., "Dear Mr. Friedman"), Filing Deadline, and Mailing Address of the specific County Appraisal District.

Instructional Appendix: Include a "General Instructions" page in the output PDF that explains how the program calculated values (e.g., explaining the $125,000 exemption logic for certain Texas jurisdictions).

3. Compliance & Protest Workflow
Extension Management: The system must allow users to generate and track "Extension Requests." If an extension is active, the Transmittal Letter and Dashboard must reflect the new "Extension Due Date."

Protest Reason Matrix: Within the "Notice of Protest (50-132)" module, provide a checklist for the user to select reasons:

Incorrect appraised value

Unequal value compared to others

Property should not be taxed in this county

Failure to send required notice

4. Advanced UX Elements
Year-over-Year "Proforma" View: The UI should provide a side-by-side comparison (2023 vs. 2024) during data entry.

Category-Specific Questions: Implement "Conditional Logic" forms. For example, if the county is Dallas, show the "Mixed-Use Vehicle Exemption (50-759)" toggle. If the state is Oklahoma, show the "Freeport Exemption (901-F)" monthly inventory averaging table.

5. Data Migration Path
Legacy Import: The CSV import engine must be pre-mapped to handle exports from legacy "Personal Property Pro" and "SaxTax" formats to lower the barrier for switching users.

Why this matters for your build:
The Transmittal Letter: Professional CPAs don't just send a tax form; they send a package. Adding this makes your software look like a "pro" tool immediately.

Inventory vs. Assets: Most developers treat everything as a depreciable asset. PPP treats inventory as a "cost-basis" item. This distinction is vital for accuracy.

The "Agent" Workflow: Since your target market includes "Firms," the ability to handle the "Appointment of Agent" and "Notice of Protest" within the same workflow (as seen in screenshots 4 and 5) is a major selling point over simple spreadsheets.