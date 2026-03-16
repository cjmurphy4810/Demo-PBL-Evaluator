# PBL Evaluator — Release Notes

## Version 1.0.0 | March 15, 2026

### Overview

The PBL Evaluator is a browser-based entitlement quality assessment platform that helps organizations evaluate, score, and improve access entitlement definitions. It provides two complementary evaluation modes: **PBL Quality Review** for plain business language readability and **RBAC Design Review** for role-based access control design quality. All processing runs entirely in the browser — no data leaves the user's device.

---

### Features

#### PBL Quality Review Engine

A five-dimension scoring engine that evaluates entitlement definitions against industry-recognized standards for access control documentation, aligned with ISO/IEC 27001:2022 (Annex A.9), NIST SP 800-53 (AC-1 through AC-25), and COBIT 2019 (DSS05).

- **Readability (25% weight)** — Measures text accessibility using Flesch Reading Ease and Gunning Fog Index. Penalizes complex vocabulary, long sentences, and overly brief descriptions.
- **Completeness (25% weight)** — Validates that all essential entitlement fields are populated: resource name, access level, conditions, business justification, and owner.
- **Clarity (20% weight)** — Detects technical jargon (45+ recognized terms), passive voice constructions, ambiguous language ("various," "as needed," "etc."), and overly complex sentence structures.
- **Specificity (15% weight)** — Identifies vague resource references ("the system," "infrastructure") and broad scope language ("full access," "as needed"). Rewards specific resource naming patterns.
- **Consistency (15% weight)** — Checks for mixed abbreviation/full-form terminology and access level contradictions (e.g., description mentions "delete" for a read-only entitlement).

**Quality Grading Scale:**
| Grade | Score Range | Meaning |
|-------|-----------|---------|
| A | 90–100 | Excellent — ready for stakeholder review |
| B | 75–89 | Good — minor improvements possible |
| C | 60–74 | Adequate — several areas need attention |
| D | 40–59 | Poor — significant revisions needed |
| F | 0–39 | Failing — requires substantial rewriting |

**Risk Tier Classification:** Each entitlement is independently classified into Critical, High, Medium, or Low risk tiers based on resource sensitivity, access breadth, and safeguard documentation.

---

#### RBAC Design Review Engine

A five-dimension evaluation engine that assesses entitlement design quality from a security and governance perspective, grounded in the ISACA CISA Review Manual (Chapter 5), NIST SP 800-53 AC-5 (Separation of Duties) and AC-6 (Least Privilege), and ISO 27001 A.9.2 (User Access Management).

- **Title-Description Alignment (25% weight)** — Evaluates whether the entitlement name accurately reflects the description. Detects mismatches (title says one thing, description says another) and contradictions (title implies restrictions, description uses broad language). Title-description misalignment is flagged as a critical design defect.
- **Role Appropriateness (25% weight)** — Assesses whether assigned roles are appropriate for the granted access level. Maintains a role-access guideline matrix covering 14 role categories. Flags violations such as Auditors with write access, Business Analysts with admin privileges, or External Customers with execute permissions.
- **Separation of Duties (25% weight)** — Identifies role combinations within a single entitlement that violate SoD principles per ISACA CISA guidelines. Evaluates 15 known conflict pairs including Developer+Tester, Developer+Security Admin, System Admin+Auditor, Database Admin+Developer, and External party+Admin combinations. Severity escalates when combined with elevated access levels.
- **Scope Definition (15% weight)** — Flags overly permissive language ("full control," "unrestricted," "unlimited"). Requires explicit conditions for external roles (Customer, Vendor) per NIST AC-17. Validates that descriptions include clear action statements when titles reference specific roles.
- **Division Relevance (10% weight)** — Validates business division assignments and flags entitlements spanning more than three divisions as potentially over-scoped. Checks for alignment between division-specific terminology and entitlement content.

**Design Findings:** Each identified issue includes a severity rating (Critical, High, Medium, Low), a plain-language description of the problem, and a specific recommendation for remediation.

---

#### Role and Division Categories

**18 Role Categories:**
Developer, Tester, Tech Ops, Business Tester, Business Ops, Business Analyst, Project Manager, Security Admin, System Admin, Database Admin, Network Admin, Application Support, Service Desk, Auditor, Compliance Officer, External Customer, External Vendor, Executive Management

**16 Business Divisions:**
Wholesale Banking, Retail Banking, Trading, Consumer Lending, Business Banking, Credit Cards, Digital Customer Experience, Wealth Management, Risk Management, Compliance, Information Technology, Operations, Human Resources, Finance, Legal, Marketing

---

#### Score Explanation

Every evaluation includes a plain-language Score Explanation section that provides per-dimension analysis:
- For dimensions scoring below 80: explains *why* the score is low with specific references to detected issues, and provides actionable guidance on what language to change and how
- For dimensions scoring 80+: confirms what the entitlement does well
- Includes a Focus Areas summary identifying the dimensions with the greatest improvement potential

---

#### User Interface

- **Dashboard** — Aggregate statistics with quality grade distribution (bar chart) and risk tier distribution (pie chart) across all evaluated entitlements
- **Guide** — Comprehensive user guide covering how to use the tool, data privacy guarantees, PBL evaluation methodology with ISO/NIST/COBIT alignment, RBAC design review methodology with ISACA CISA separation of duties documentation, and scoring formulas
- **Evaluate** — Entitlement submission form with toggle between PBL Quality Review and RBAC Design Review modes. Includes multi-select dropdowns for role and division assignment. Results display alongside the form with scores, dimensions, flags, recommendations, and score explanations
- **Entitlements** — Searchable, filterable table of all saved entitlements. Click any record to view its evaluation detail with toggle between PBL and RBAC results. Supports re-evaluation, search by name/description, and filtering by risk tier and quality grade

---

#### Architecture and Data Privacy

- **Fully client-side application** — all evaluation logic (rule engines, tier classifier, RBAC engine) runs in the browser via TypeScript. No backend server, no API calls, no external data transmission.
- **Browser local storage** — all entitlement records and evaluation history are stored in the browser's localStorage on the user's device. Data is never sent to any server.
- **Static deployment** — hosted on GitHub Pages as static HTML/CSS/JavaScript files. The hosting platform serves code only; it has no access to user data.
- **Device-independent** — each browser instance maintains its own isolated data store. Records created on one device do not appear on another.
- **Built with** — React 18, TypeScript, Tailwind CSS, React Router, TanStack React Query, Recharts, Vite

---

#### Intended Use Cases

1. **New entitlement creation** — Authors drafting new entitlement definitions can use the PBL Quality Review to ensure the language meets readability and completeness standards before submitting to production systems.
2. **RBAC design validation** — Security and governance teams can use the RBAC Design Review to validate that entitlements are correctly designed with appropriate role assignments, separation of duties compliance, and properly scoped access boundaries.
3. **Certification review support** — Entitlement owners can use both review modes during access certification campaigns to identify and remediate issues in entitlements they are certifying, whether originally created by them or by others.
4. **Continuous improvement** — The iterative evaluate-review-improve workflow helps organizations raise the overall quality of their entitlement portfolio over time.

---

### Technical Details

- **Repository:** github.com/cjmurphy4810/PBL-Evaluator
- **Branch:** feature/phase-1-foundation
- **Deployment:** GitHub Pages (static, auto-deploys on push)
- **Live URL:** https://cjmurphy4810.github.io/PBL-Evaluator/
