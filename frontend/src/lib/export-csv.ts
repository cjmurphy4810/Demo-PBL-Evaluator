// CSV export utility — generates downloadable CSV from entitlement + evaluation data

import type { Entitlement } from "../types/api";
import { evaluateRules } from "./rule-engine";
import { classifyTier } from "./tier-classifier";
import { evaluateRbac } from "./rbac-engine";

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function runPblForExport(ent: Entitlement) {
  const rules = evaluateRules({
    description: ent.description,
    resource_name: ent.resource_name,
    access_level: ent.access_level,
    conditions: ent.conditions ?? undefined,
    business_justification: ent.business_justification ?? undefined,
    owner: ent.owner ?? undefined,
  });
  const tier = classifyTier(ent);
  return { rules, tier, grade: gradeFromScore(rules.rule_score) };
}

function runRbacForExport(ent: Entitlement) {
  return evaluateRbac({
    ...ent,
    conditions: ent.conditions ?? undefined,
    business_justification: ent.business_justification ?? undefined,
    owner: ent.owner ?? undefined,
  });
}

export function exportCSV(entitlements: Entitlement[]): void {
  const headers = [
    "Entitlement Name",
    "Description",
    "Resource Type",
    "Resource Name",
    "Access Level",
    "Roles",
    "Divisions",
    "Conditions",
    "Business Justification",
    "Owner",
    "PBL Score",
    "PBL Grade",
    "PBL Risk Tier",
    "Readability",
    "Completeness",
    "Clarity",
    "Specificity",
    "Consistency",
    "PBL Flags",
    "PBL Recommendations",
    "RBAC Score",
    "RBAC Grade",
    "RBAC Risk Tier",
    "Title-Desc Alignment",
    "Role Appropriateness",
    "Separation of Duties",
    "Scope Definition",
    "Division Relevance",
    "RBAC Findings",
    "RBAC Recommendations",
    "Created At",
  ];

  const rows = entitlements.map((ent) => {
    const pbl = runPblForExport(ent);
    const rbac = runRbacForExport(ent);

    return [
      ent.name,
      ent.description,
      ent.resource_type,
      ent.resource_name,
      ent.access_level,
      (ent.roles ?? []).join("; "),
      (ent.divisions ?? []).join("; "),
      ent.conditions,
      ent.business_justification,
      ent.owner,
      pbl.rules.rule_score.toFixed(1),
      pbl.grade,
      pbl.tier.tier,
      pbl.rules.readability_score.toFixed(1),
      pbl.rules.completeness_score.toFixed(0),
      pbl.rules.clarity_score.toFixed(1),
      pbl.rules.specificity_score.toFixed(1),
      pbl.rules.consistency_score.toFixed(1),
      pbl.rules.flags.join("; "),
      "", // PBL recommendations generated from flags, kept brief for CSV
      rbac.final_score.toFixed(1),
      rbac.quality_grade,
      rbac.risk_tier,
      rbac.dimensions.title_description_alignment.toFixed(1),
      rbac.dimensions.role_appropriateness.toFixed(1),
      rbac.dimensions.separation_of_duties.toFixed(1),
      rbac.dimensions.scope_definition.toFixed(1),
      rbac.dimensions.division_relevance.toFixed(1),
      rbac.findings.map((f) => `[${f.severity.toUpperCase()}] ${f.description}`).join("; "),
      rbac.recommendations.join("; "),
      ent.created_at,
    ].map(escapeCSV);
  });

  const csv = [headers.map(escapeCSV).join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PBL_Evaluator_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
