# PBL Evaluator — Plain Business Language Quality & Tier Classification Platform

> **Domain**: Access/Identity Entitlement descriptions (RBAC, ABAC policies)
> **Purpose**: Evaluate PBL quality of entitlement descriptions and classify entitlements by business criticality / audit risk tier
> **Architecture**: Monolithic FastAPI + React + PostgreSQL + Hybrid evaluation (rules + LLM)
> **Date**: 2026-03-03

---

## Table of Contents

1. [Research Summary](#1-research-summary)
2. [Problem Statement](#2-problem-statement)
3. [System Design](#3-system-design)
4. [Data Model](#4-data-model)
5. [PBL Quality Evaluation Engine](#5-pbl-quality-evaluation-engine)
6. [Tier Classification System](#6-tier-classification-system)
7. [Phased Ingestion Strategy](#7-phased-ingestion-strategy)
8. [Technology Stack](#8-technology-stack)
9. [Implementation Phases](#9-implementation-phases)
10. [API Specification](#10-api-specification)
11. [Testing Strategy](#11-testing-strategy)
12. [Sources & References](#12-sources--references)

---

## 1. Research Summary

### What is Entitlement Plain Business Language (PBL)?

"Entitlement Plain Business Language" is not a formally standardized term in industry literature. However, the concept it represents is critical and well-understood across IT Asset Management (ITAM), Software Asset Management (SAM), and Identity & Access Management (IAM):

**PBL is the practice of translating complex, often ambiguous technical and legal language in entitlement definitions into clear, unambiguous, business-readable descriptions that non-specialist stakeholders can understand and act on.**

In the Access/Identity domain specifically, this means ensuring that:
- Role definitions clearly describe what access they grant and why
- Permission descriptions are unambiguous about scope and conditions
- Policy statements use plain language rather than technical jargon
- Entitlement boundaries are clearly delineated (what's included vs. excluded)

### Why PBL Quality Matters for Access Entitlements

| Problem | Business Impact |
|---------|----------------|
| Ambiguous role descriptions | Over-provisioning of access, security risk |
| Jargon-heavy policy statements | Compliance failures during audits |
| Inconsistent naming conventions | Duplicate entitlements, access sprawl |
| Missing conditions/constraints | Unintended access grants, privilege escalation |
| No clear business justification | Failed access reviews, audit findings |

### Key Standards and Frameworks Informing This Design

- **ISO 24495-1:2023** — International plain language standard (25 countries, 19 languages)
- **ISO/IEC 19770-3** — Entitlement schema for standardized entitlement descriptions
- **NIST SP 800-53** — Access control policies requiring clear documentation
- **ClearMark Awards Criteria** — 4-principle, 1-5 scale evaluation rubric for plain language quality
- **Federal Plain Writing Act of 2010** — Legal requirements for clear government communication
- **Kleimann-James Evaluation Framework** — Text Focus, User Focus, Outcomes Focus evaluation spectrums

### NLP/AI Evaluation Landscape

Research shows that a **hybrid approach** combining traditional readability formulas with LLM-based evaluation produces the best results:

- **GPT-4** achieves r=0.76 correlation with human readability judgments, outperforming all traditional formulas alone (Trott et al., 2024)
- **Traditional formulas** (Flesch-Kincaid, Gunning Fog, SMOG, Dale-Chall) provide fast, deterministic baselines
- **LLM-as-a-Judge** matches human judgment ~80% of the time with hybrid prompting
- **Ensemble methods** combining rules + LLM scores are most robust and cost-effective

---

## 2. Problem Statement

Organizations managing access/identity entitlements face three core problems:

### 2.1 Poor Entitlement Description Quality
Entitlement descriptions are often written by engineers in technical jargon, making them incomprehensible to business stakeholders, auditors, and compliance teams. Examples:

**Bad PBL:**
> "R/W access to prod k8s ns:payments via SA w/ RBAC binding to ClusterRole admin"

**Good PBL:**
> "Read and write access to the production payments system. Granted through a service account with full administrative privileges in the payments namespace. Requires manager approval and quarterly review."

### 2.2 No Systematic Risk Classification
Entitlements are not consistently classified by business criticality or audit risk. A "read-only access to internal wiki" and "full admin access to production databases" may receive the same level of documentation and review scrutiny.

### 2.3 Manual Review Doesn't Scale
Organizations with thousands of entitlements cannot manually review each description for quality, completeness, and appropriate risk classification. Automated evaluation is needed.

---

## 3. System Design

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│  │ Dashboard │ │ Evaluate │ │ Reports │ │ Config  │ │
│  └──────────┘ └──────────┘ └─────────┘ └─────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────┴──────────────────────────────┐
│                  FastAPI Backend                      │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│  │ Ingestion│ │ Rule     │ │ LLM     │ │ Report  │ │
│  │ Service  │ │ Engine   │ │ Evaluator│ │ Service │ │
│  └──────────┘ └──────────┘ └─────────┘ └─────────┘ │
│  ┌──────────────────────────────────────────────────┐│
│  │         Celery Task Queue (async LLM work)       ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────┬──────────────────────────────┘
           ┌───────────┼───────────┐
           │           │           │
     ┌─────┴─────┐ ┌──┴──┐ ┌─────┴─────┐
     │ PostgreSQL │ │Redis│ │ Claude API│
     │ (data)     │ │(queue│ │ (LLM eval)│
     └───────────┘ │cache)│ └───────────┘
                   └─────┘
```

### 3.2 Core Components

| Component | Responsibility |
|-----------|---------------|
| **Ingestion Service** | Parse and normalize entitlement data from all input sources (text, files, API) |
| **Rule Engine** | Fast, deterministic evaluation using readability formulas, regex patterns, and custom rules |
| **LLM Evaluator** | Nuanced evaluation of flagged items using Claude API with structured prompts |
| **Report Service** | Generate quality reports, trend analysis, and compliance dashboards |
| **Celery Workers** | Async processing of LLM evaluation tasks to prevent API blocking |

### 3.3 Evaluation Pipeline

```
Input Entitlement
       │
       ▼
┌──────────────┐
│  Normalize   │ ← Strip formatting, extract metadata
│  & Parse     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Rule Engine │ ← Readability scores, pattern checks, completeness checks
│  (Fast Pass) │   Produces: rule_score (0-100), flags[], tier_suggestion
└──────┬───────┘
       │
       ├── If rule_score > 80 and no flags → DONE (fast path)
       │
       ▼
┌──────────────┐
│  LLM Eval    │ ← Claude API with structured rubric prompt
│  (Deep Pass) │   Produces: llm_score (0-100), dimensions{}, recommendations[]
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Score Merge  │ ← Weighted ensemble: final_score = 0.4 * rule + 0.6 * llm
│  & Classify   │   Produces: final_score, quality_grade, risk_tier
└──────┬───────┘
       │
       ▼
   Store Results
```

---

## 4. Data Model

### 4.1 Core Entities

```python
# Entitlement — the primary entity being evaluated
class Entitlement:
    id: UUID
    name: str                    # e.g., "Production DB Admin"
    description: str             # The PBL text being evaluated
    resource_type: str           # e.g., "database", "application", "API"
    resource_name: str           # e.g., "payments-db-prod"
    access_level: str            # e.g., "read", "write", "admin", "full"
    conditions: str | None       # e.g., "Requires VPN and MFA"
    business_justification: str | None
    owner: str | None            # Team or individual responsible
    source: str                  # "manual", "csv_upload", "okta_api", etc.
    created_at: datetime
    updated_at: datetime

# Evaluation — the result of evaluating an entitlement's PBL
class Evaluation:
    id: UUID
    entitlement_id: UUID         # FK to Entitlement

    # Rule Engine scores
    rule_score: float            # 0-100 composite rule score
    readability_grade: float     # Flesch-Kincaid grade level
    reading_ease: float          # Flesch Reading Ease (0-100)
    gunning_fog: float           # Gunning Fog index
    word_count: int
    sentence_count: int
    avg_sentence_length: float
    passive_voice_ratio: float
    jargon_count: int
    completeness_score: float    # 0-100: are required fields present?

    # LLM scores (nullable — only populated for deep pass)
    llm_score: float | None      # 0-100 holistic LLM score
    clarity_score: float | None  # LLM dimension: is the meaning clear?
    specificity_score: float | None  # LLM dimension: is scope well-defined?
    actionability_score: float | None  # LLM dimension: can someone act on this?
    consistency_score: float | None   # LLM dimension: consistent terminology?

    # Final composite
    final_score: float           # 0-100 weighted ensemble
    quality_grade: str           # A, B, C, D, F
    risk_tier: str               # "critical", "high", "medium", "low"

    flags: list[str]             # Issues detected (e.g., "jargon_detected", "missing_conditions")
    recommendations: list[str]   # Improvement suggestions

    evaluated_at: datetime
    evaluation_method: str       # "rules_only", "hybrid"

# RiskTierConfig — configurable tier classification rules
class RiskTierConfig:
    id: UUID
    tier_name: str               # "critical", "high", "medium", "low"
    tier_level: int              # 1=critical, 2=high, 3=medium, 4=low
    criteria: dict               # JSON rules for automatic classification
    color: str                   # UI display color
    review_frequency: str        # e.g., "monthly", "quarterly", "annually"
    approval_required: bool
    description: str
```

### 4.2 Risk Tier Classification Criteria

| Tier | Level | Criteria | Review Cycle |
|------|-------|----------|-------------|
| **Critical** | 1 | Admin/full access to production systems, PII/financial data access, infrastructure-level permissions | Monthly |
| **High** | 2 | Write access to production, access to sensitive (non-PII) data, cross-system service accounts | Quarterly |
| **Medium** | 3 | Read access to production, write access to non-prod, standard business application access | Semi-annually |
| **Low** | 4 | Read-only access to non-sensitive systems, documentation wikis, internal tools | Annually |

Classification signals (used by both rules and LLM):
- **Resource sensitivity keywords**: "production", "prod", "PII", "financial", "admin", "root", "superuser"
- **Access level**: admin > write > read > view
- **Scope indicators**: "all", "unlimited", "unrestricted" → higher tier
- **Condition presence**: Missing conditions on broad access → tier escalation
- **Business justification**: Missing justification → tier escalation

---

## 5. PBL Quality Evaluation Engine

### 5.1 Rule Engine (Fast Pass)

The rule engine produces a deterministic score in <100ms per entitlement. It evaluates five dimensions:

#### Dimension 1: Readability (25% weight)
Using `textstat` library:
- Flesch Reading Ease: target ≥ 60 (8th grade level)
- Gunning Fog Index: target ≤ 12
- Average sentence length: target ≤ 20 words
- Scoring: linear scale from 0-100 based on formula outputs

#### Dimension 2: Completeness (25% weight)
Check for required information fields:
- [ ] Resource being accessed is named (+20)
- [ ] Access level is specified (read/write/admin) (+20)
- [ ] Conditions/constraints are stated (+20)
- [ ] Business justification is present (+20)
- [ ] Owner/responsible party is identified (+20)

#### Dimension 3: Clarity (20% weight)
Pattern-based checks:
- Jargon detection: flag technical abbreviations not in a defined glossary (-5 per instance, min 0)
- Passive voice ratio: target < 20% of sentences (-2 per percentage point over)
- Ambiguous quantifiers: flag "some", "various", "etc.", "and/or" (-5 each)
- Sentence complexity: flag sentences > 25 words (-3 each)

#### Dimension 4: Specificity (15% weight)
- Vague resource references: flag "the system", "the database", "resources" without specifics (-10 each)
- Vague scope: flag "as needed", "various permissions", "general access" (-10 each)
- Named resources: bonus for specific system/service names (+10 each, max 30)

#### Dimension 5: Consistency (15% weight)
- Terminology consistency within the entitlement text
- Format adherence to organizational template (if configured)
- Naming convention compliance (configurable regex patterns)

#### Rule Score Formula
```
rule_score = (readability * 0.25) + (completeness * 0.25) +
             (clarity * 0.20) + (specificity * 0.15) + (consistency * 0.15)
```

### 5.2 LLM Evaluator (Deep Pass)

Triggered when: `rule_score < 80` OR any critical flags are raised.

#### Structured Evaluation Prompt

```
You are evaluating the quality of an access entitlement description
written in Plain Business Language (PBL).

The entitlement description should clearly communicate:
1. WHAT resource or system is being accessed
2. WHAT level of access is granted (read, write, admin, etc.)
3. WHO this entitlement is intended for
4. UNDER WHAT CONDITIONS access is granted or restricted
5. WHY this access is needed (business justification)

Evaluate the following entitlement description on these dimensions.
Score each 0-100:

- clarity: Can a non-technical business stakeholder understand this?
- specificity: Are resources, scope, and boundaries precisely defined?
- actionability: Could an access reviewer approve/deny based on this alone?
- consistency: Is terminology used consistently throughout?

Also provide:
- overall_score: 0-100 holistic quality score
- risk_assessment: "critical" | "high" | "medium" | "low" based on
  the sensitivity of what's being accessed
- flags: list of specific issues found
- recommendations: list of specific improvements

ENTITLEMENT:
Name: {name}
Description: {description}
Resource: {resource_type} / {resource_name}
Access Level: {access_level}
Conditions: {conditions}
Business Justification: {business_justification}

Respond in JSON format.
```

### 5.3 Score Merging

```python
if llm_score is not None:
    final_score = (rule_score * 0.4) + (llm_score * 0.6)
else:
    final_score = rule_score

# Quality grade mapping
quality_grade = (
    "A" if final_score >= 90 else
    "B" if final_score >= 75 else
    "C" if final_score >= 60 else
    "D" if final_score >= 40 else
    "F"
)
```

---

## 6. Tier Classification System

### 6.1 Automatic Classification

The system uses a **signal-based classifier** that combines keyword detection, access level analysis, and LLM assessment:

```python
def classify_risk_tier(entitlement: Entitlement, evaluation: Evaluation) -> str:
    score = 0

    # Access level signals
    access_weights = {"admin": 40, "full": 40, "write": 25, "read": 10, "view": 5}
    score += access_weights.get(entitlement.access_level, 15)

    # Resource sensitivity signals
    critical_keywords = ["production", "prod", "pii", "financial", "payment",
                         "credential", "secret", "root", "infrastructure"]
    high_keywords = ["staging", "sensitive", "internal-api", "service-account",
                     "cross-system", "database"]

    description_lower = (entitlement.description + " " + entitlement.resource_name).lower()

    if any(kw in description_lower for kw in critical_keywords):
        score += 30
    elif any(kw in description_lower for kw in high_keywords):
        score += 20

    # Scope signals
    broad_scope = ["all", "unlimited", "unrestricted", "wildcard", "*"]
    if any(kw in description_lower for kw in broad_scope):
        score += 15

    # Missing safeguards escalation
    if not entitlement.conditions:
        score += 10
    if not entitlement.business_justification:
        score += 5

    # LLM risk assessment override
    if evaluation.llm_risk_assessment == "critical":
        score = max(score, 70)

    # Tier mapping
    if score >= 60:
        return "critical"
    elif score >= 40:
        return "high"
    elif score >= 20:
        return "medium"
    else:
        return "low"
```

### 6.2 Manual Override

Administrators can override automatic tier classification with a justification note. Overrides are logged and auditable.

### 6.3 Tier-Based Actions

| Tier | Auto-Actions |
|------|-------------|
| **Critical** | Flag for immediate review, require manager approval, enforce monthly recertification |
| **High** | Queue for priority review, quarterly recertification |
| **Medium** | Include in next scheduled review cycle |
| **Low** | Annual review, self-certification allowed |

---

## 7. Phased Ingestion Strategy

### Phase 1: Manual Input (MVP)
- Web form for entering individual entitlement descriptions
- Real-time evaluation as user types (rule engine only)
- Full evaluation on submit (hybrid rules + LLM)
- Copy/paste of existing entitlement text

### Phase 2: File Upload
- CSV upload with column mapping UI
- JSON upload (structured entitlement records)
- Excel upload (.xlsx) with sheet selection
- Batch evaluation with progress tracking
- Export results as CSV/PDF

### Phase 3: API Integration
- REST API for programmatic submission
- Webhook support for CI/CD pipelines
- IdP connectors:
  - **Okta**: Pull roles and entitlements via Okta API
  - **Microsoft Entra ID**: Access packages and role definitions via Microsoft Graph
  - **AWS IAM**: IAM policies and role descriptions via AWS SDK
- Scheduled sync for continuous monitoring

---

## 8. Technology Stack

### Backend
| Component | Technology | Justification |
|-----------|-----------|---------------|
| API Framework | **FastAPI** (Python 3.12+) | Async-native, auto-docs, Pydantic validation, ideal for NLP |
| Task Queue | **Celery** + **Redis** | Async LLM evaluation, background batch processing |
| Database | **PostgreSQL 16** | Relational integrity for entitlements, JSONB for flexible metadata |
| ORM | **SQLAlchemy 2.0** + **Alembic** | Type-safe models, migration management |
| NLP | **textstat** | 16+ readability formulas, actively maintained |
| Prose Linting | **Vale** (CLI) | Customizable style rules, CI/CD integration |
| LLM | **Anthropic Claude API** | Structured output, strong reasoning for nuanced evaluation |
| Auth | **FastAPI-Users** or JWT | Session management, role-based access |

### Frontend
| Component | Technology | Justification |
|-----------|-----------|---------------|
| Framework | **React 19** + **TypeScript** | Component-based, type-safe |
| Build Tool | **Vite** | Fast dev server, optimized builds |
| UI Library | **shadcn/ui** + **Tailwind CSS** | Professional design system, rapid development |
| Charts | **Recharts** or **Tremor** | Dashboard visualizations |
| State | **TanStack Query** | Server state management, caching |
| Routing | **React Router v7** | Client-side routing |

### Infrastructure
| Component | Technology | Justification |
|-----------|-----------|---------------|
| Containerization | **Docker** + **Docker Compose** | Reproducible environments |
| CI/CD | **GitHub Actions** | Automated testing and deployment |
| Monitoring | **Sentry** | Error tracking |
| API Docs | **OpenAPI** (auto-generated by FastAPI) | Interactive API documentation |

---

## 9. Implementation Phases

### Phase 1: Foundation & Core Engine (Weeks 1-3)

**Goal**: Working evaluation engine with manual input.

1. **Project scaffolding**
   - FastAPI project structure with routers, services, models
   - PostgreSQL + Alembic migrations
   - Docker Compose for local development
   - pytest setup with fixtures

2. **Data model implementation**
   - Entitlement, Evaluation, RiskTierConfig models
   - CRUD endpoints for entitlements
   - Database seed data with example entitlements

3. **Rule Engine**
   - textstat integration for readability scoring
   - Completeness checker
   - Clarity pattern detector (jargon, passive voice, ambiguity)
   - Specificity analyzer
   - Consistency checker
   - Score calculation and grade assignment

4. **LLM Evaluator**
   - Claude API integration with structured prompts
   - Response parsing and validation
   - Celery task for async evaluation
   - Score merging logic

5. **Tier Classifier**
   - Signal-based classification algorithm
   - Configurable tier rules
   - Manual override capability

### Phase 2: Frontend & Dashboard (Weeks 4-5)

**Goal**: Usable web interface for evaluation and review.

1. **Evaluation interface**
   - Manual entitlement input form
   - Real-time rule engine preview
   - Full evaluation results display with dimensional breakdown
   - Recommendations panel

2. **Dashboard**
   - Quality distribution chart (A/B/C/D/F breakdown)
   - Risk tier distribution
   - Trend over time
   - Worst-scoring entitlements list

3. **Entitlement management**
   - List/search/filter entitlements
   - Detail view with evaluation history
   - Tier override with audit log

### Phase 3: Batch & File Upload (Weeks 6-7)

**Goal**: Process entitlements at scale.

1. **File upload**
   - CSV parser with column mapping
   - JSON structured import
   - Excel (.xlsx) support
   - Batch evaluation queue with progress tracking

2. **Bulk operations**
   - Batch re-evaluation
   - Export results (CSV, PDF report)
   - Comparison view (before/after improvements)

### Phase 4: API Integration & Connectors (Weeks 8-10)

**Goal**: Automated ingestion from identity providers.

1. **REST API for programmatic access**
   - API key authentication
   - Rate limiting
   - Webhook callbacks on evaluation completion

2. **IdP connectors** (one at a time)
   - Okta connector
   - Microsoft Entra ID connector
   - AWS IAM connector

3. **Scheduled sync**
   - Cron-based re-evaluation
   - Change detection and delta evaluation
   - Alerting on tier changes or quality degradation

---

## 10. API Specification

### Core Endpoints

```
POST   /api/v1/entitlements              # Create entitlement
GET    /api/v1/entitlements              # List entitlements (paginated, filterable)
GET    /api/v1/entitlements/{id}         # Get entitlement detail
PUT    /api/v1/entitlements/{id}         # Update entitlement
DELETE /api/v1/entitlements/{id}         # Delete entitlement

POST   /api/v1/evaluate                  # Evaluate a single entitlement (inline)
POST   /api/v1/evaluate/batch            # Batch evaluate (async, returns job ID)
GET    /api/v1/evaluate/job/{job_id}     # Check batch job status

GET    /api/v1/evaluations/{id}          # Get evaluation result
GET    /api/v1/entitlements/{id}/evaluations  # Evaluation history for an entitlement

POST   /api/v1/upload                    # Upload file for batch processing
GET    /api/v1/upload/{id}/status        # Check upload processing status

GET    /api/v1/reports/summary           # Dashboard summary stats
GET    /api/v1/reports/quality           # Quality distribution report
GET    /api/v1/reports/risk-tiers        # Risk tier distribution report
GET    /api/v1/reports/trends            # Quality trends over time

GET    /api/v1/config/tiers              # Get tier configuration
PUT    /api/v1/config/tiers              # Update tier configuration
PUT    /api/v1/config/rules              # Update rule engine configuration
```

### Example Request/Response

**POST /api/v1/evaluate**
```json
{
  "name": "Production DB Admin",
  "description": "Full administrative access to the production PostgreSQL database cluster including read, write, delete, and schema modification privileges.",
  "resource_type": "database",
  "resource_name": "payments-db-prod",
  "access_level": "admin",
  "conditions": "Requires VPN connection, MFA, and manager approval. Access logged and reviewed monthly.",
  "business_justification": "Required for database maintenance, schema migrations, and incident response by the Platform Engineering team."
}
```

**Response:**
```json
{
  "entitlement_id": "550e8400-e29b-41d4-a716-446655440000",
  "evaluation": {
    "final_score": 87.5,
    "quality_grade": "B",
    "risk_tier": "critical",
    "rule_score": 82.0,
    "llm_score": 91.2,
    "dimensions": {
      "readability": 85,
      "completeness": 100,
      "clarity": 78,
      "specificity": 90,
      "consistency": 80,
      "actionability": 88
    },
    "flags": [
      "high_access_level_production",
      "contains_destructive_permissions"
    ],
    "recommendations": [
      "Consider specifying which schemas can be modified",
      "Add time-bound access constraint (e.g., break-glass with auto-expiry)",
      "Clarify whether 'delete' includes table/database drop operations"
    ]
  }
}
```

---

## 11. Testing Strategy

### Unit Tests
- Rule engine scoring functions (each dimension independently)
- Tier classification logic with edge cases
- Score merging and grade calculation
- Input validation and normalization

### Integration Tests
- Full evaluation pipeline (ingestion → rules → LLM → scoring)
- Database operations (CRUD, evaluation history)
- File upload parsing (CSV, JSON, Excel)
- Celery task execution

### LLM Evaluation Tests
- Mock Claude API responses for deterministic testing
- Prompt regression tests (ensure prompt changes don't degrade quality)
- Score consistency checks (same input → similar scores across runs)

### Quality Benchmarks
- Curated dataset of 50+ entitlements with human-assigned quality grades
- Automated comparison of system grades vs. human grades
- Target: ≥80% agreement between system and human grades

---

## 12. Sources & References

### Standards & Frameworks
- ISO 24495-1:2023 — Plain language standard
- ISO/IEC 19770-3 — Entitlement schema
- NIST SP 800-53 — Access control documentation requirements
- Federal Plain Writing Act of 2010
- ClearMark Awards Criteria (Center for Plain Language)
- Kleimann-James Integrated Evaluation Framework

### Academic Research
- Trott et al. (2024) — "Measuring and Modifying Readability with GPT-4" (arXiv)
- CLEAR Corpus — Linguistic constructs of text readability using NLP (Taylor & Francis)
- Document Classification with NLP — BERT achieves >99% accuracy (arXiv)
- NLP-based validation: 66.7% reduction in validation time (IJCA, 2025)

### Industry Sources
- Flexera AI-Driven Purchase & Entitlement Ingestion
- ServiceNow Software Asset Management
- Microsoft Entra Entitlement Management
- Oracle Licensing Experts — Oracle license definitions
- SAP Licensing Experts — Named user vs. engine licensing
- TLDRLegal — Plain language license summaries
- Anglepoint SAM Services

### Technology Documentation
- FastAPI — https://fastapi.tiangolo.com/
- textstat — https://github.com/textstat/textstat
- Vale prose linter — https://vale.sh/
- Hugging Face Transformers — https://huggingface.co/docs/transformers/
- spaCy — https://spacy.io/
- Anthropic Claude API — https://docs.anthropic.com/
- Celery — https://docs.celeryq.dev/
