# PBL Evaluator — Design Document

> **Date**: 2026-03-03
> **Status**: Proposed

## Overview

A platform for evaluating the Plain Business Language (PBL) quality of Access/Identity entitlement descriptions and classifying entitlements by business criticality / audit risk tier.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Domain | Access/Identity Entitlements | RBAC/ABAC policies need clear documentation for audits and compliance |
| Tier Classification | Business criticality / audit risk | Drives review frequency and approval requirements |
| Data Ingestion | Phased (manual → file → API) | MVP-first approach, iterate on integration |
| Evaluation Engine | Hybrid (rules + LLM) | Rules for speed, LLM for nuance |
| Architecture | Monolithic FastAPI | Fastest to build, decomposable later |

## Key Components

1. **Rule Engine** — Fast readability/completeness/clarity scoring using textstat + custom patterns
2. **LLM Evaluator** — Claude API for nuanced quality assessment with structured rubric
3. **Tier Classifier** — Signal-based risk classification (critical/high/medium/low)
4. **Dashboard** — React frontend for evaluation, reporting, and management

## Full Plan

See [plan.md](../../plan.md) for the complete implementation plan.
