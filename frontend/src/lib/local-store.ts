// localStorage-based persistence — replaces backend database

import type {
  Entitlement,
  Evaluation,
  EvaluateRequest,
  EvaluateResponse,
  RbacEvaluation,
  RbacEvaluateResponse,
  SummaryReport,
} from "../types/api";
import { evaluateRules } from "./rule-engine";
import { classifyTier } from "./tier-classifier";
import { evaluateRbac } from "./rbac-engine";

const ENTITLEMENTS_KEY = "pbl_entitlements";
const EVALUATIONS_KEY = "pbl_evaluations";

function uuid(): string {
  return crypto.randomUUID();
}

function loadEntitlements(): Entitlement[] {
  const raw = localStorage.getItem(ENTITLEMENTS_KEY);
  if (!raw) return [];
  // Migrate old records that don't have roles/divisions
  const items: Entitlement[] = JSON.parse(raw);
  return items.map((e) => ({
    ...e,
    roles: e.roles ?? [],
    divisions: e.divisions ?? [],
  }));
}

function saveEntitlements(items: Entitlement[]) {
  localStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify(items));
}

function loadEvaluations(): Evaluation[] {
  const raw = localStorage.getItem(EVALUATIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveEvaluations(items: Evaluation[]) {
  localStorage.setItem(EVALUATIONS_KEY, JSON.stringify(items));
}

function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function generateRecommendations(flags: string[]): string[] {
  const recs: string[] = [];
  const map: Record<string, string> = {
    text_too_short: "Add more detail to the description to improve readability scoring.",
    high_gunning_fog: "Simplify sentence structure and reduce complex vocabulary.",
    long_sentences: "Break long sentences into shorter, clearer statements.",
    missing_conditions: "Add conditions or constraints for when this entitlement applies.",
    missing_business_justification: "Provide a clear business justification for this access.",
    jargon_detected: "Replace technical jargon with plain business language where possible.",
    high_passive_voice: "Rewrite passive voice sentences in active voice for clarity.",
    ambiguous_terms: "Replace vague terms like 'various', 'some', 'etc.' with specifics.",
    complex_sentences: "Simplify complex sentences to improve comprehension.",
    vague_resources: "Name specific resources instead of generic terms like 'the system'.",
    vague_scope: "Define exact permissions instead of 'broad access' or 'as needed'.",
    inconsistent_access_level: "The description mentions actions beyond the stated access level.",
  };
  for (const flag of flags) {
    if (map[flag]) recs.push(map[flag]);
    else if (flag.startsWith("mixed_terminology_"))
      recs.push(`Use consistent terminology — don't mix '${flag.replace("mixed_terminology_", "")}' with its full form.`);
  }
  return recs;
}

function runEvaluation(data: EvaluateRequest, entitlementId: string): Evaluation {
  const rules = evaluateRules(data);
  const tier = classifyTier(data);
  const finalScore = rules.rule_score;
  const grade = gradeFromScore(finalScore);
  const recommendations = generateRecommendations(rules.flags);

  return {
    id: uuid(),
    entitlement_id: entitlementId,
    rule_score: rules.rule_score,
    llm_score: null,
    final_score: Math.round(finalScore * 100) / 100,
    quality_grade: grade,
    risk_tier: tier.tier,
    dimensions: {
      readability: rules.readability_score,
      completeness: rules.completeness_score,
      clarity: rules.clarity_score,
      specificity: rules.specificity_score,
      consistency: rules.consistency_score,
      actionability: null,
    },
    flags: rules.flags,
    recommendations,
    evaluation_method: "rules_only",
    evaluated_at: new Date().toISOString(),
  };
}

function findOrCreateEntitlement(data: EvaluateRequest): Entitlement {
  const entitlements = loadEntitlements();
  const now = new Date().toISOString();

  const entitlement: Entitlement = {
    id: uuid(),
    name: data.name,
    description: data.description,
    resource_type: data.resource_type,
    resource_name: data.resource_name,
    access_level: data.access_level,
    conditions: data.conditions ?? null,
    business_justification: data.business_justification ?? null,
    owner: data.owner ?? null,
    roles: data.roles ?? [],
    divisions: data.divisions ?? [],
    source: "manual",
    created_at: now,
    updated_at: now,
  };

  entitlements.push(entitlement);
  saveEntitlements(entitlements);
  return entitlement;
}

// --- Public API ---

export async function evaluateInline(data: EvaluateRequest): Promise<EvaluateResponse> {
  const entitlement = findOrCreateEntitlement(data);
  const evaluation = runEvaluation(data, entitlement.id);
  const evaluations = loadEvaluations();
  evaluations.push(evaluation);
  saveEvaluations(evaluations);

  return { entitlement_id: entitlement.id, evaluation };
}

export async function evaluateRbacInline(data: EvaluateRequest): Promise<RbacEvaluateResponse> {
  const entitlement = findOrCreateEntitlement(data);
  const rbacResult = evaluateRbac(data);

  const evaluation: RbacEvaluation = {
    id: uuid(),
    entitlement_id: entitlement.id,
    final_score: rbacResult.final_score,
    quality_grade: rbacResult.quality_grade,
    risk_tier: rbacResult.risk_tier,
    dimensions: rbacResult.dimensions,
    flags: rbacResult.flags,
    recommendations: rbacResult.recommendations,
    findings: rbacResult.findings,
    evaluation_method: "rbac_design_review",
    evaluated_at: new Date().toISOString(),
  };

  return { entitlement_id: entitlement.id, evaluation };
}

export async function reEvaluate(entitlementId: string): Promise<EvaluateResponse> {
  const entitlements = loadEntitlements();
  const ent = entitlements.find((e) => e.id === entitlementId);
  if (!ent) throw new Error("Entitlement not found");

  const evalData = {
    ...ent,
    conditions: ent.conditions ?? undefined,
    business_justification: ent.business_justification ?? undefined,
    owner: ent.owner ?? undefined,
  };
  const evaluation = runEvaluation(evalData, entitlementId);
  const evaluations = loadEvaluations();
  evaluations.push(evaluation);
  saveEvaluations(evaluations);

  return { entitlement_id: entitlementId, evaluation };
}

export async function reEvaluateRbac(entitlementId: string): Promise<RbacEvaluateResponse> {
  const entitlements = loadEntitlements();
  const ent = entitlements.find((e) => e.id === entitlementId);
  if (!ent) throw new Error("Entitlement not found");

  const rbacResult = evaluateRbac({
    ...ent,
    conditions: ent.conditions ?? undefined,
    business_justification: ent.business_justification ?? undefined,
    owner: ent.owner ?? undefined,
  });

  const evaluation: RbacEvaluation = {
    id: uuid(),
    entitlement_id: entitlementId,
    final_score: rbacResult.final_score,
    quality_grade: rbacResult.quality_grade,
    risk_tier: rbacResult.risk_tier,
    dimensions: rbacResult.dimensions,
    flags: rbacResult.flags,
    recommendations: rbacResult.recommendations,
    findings: rbacResult.findings,
    evaluation_method: "rbac_design_review",
    evaluated_at: new Date().toISOString(),
  };

  return { entitlement_id: entitlementId, evaluation };
}

export async function listEntitlements(params?: {
  search?: string;
  risk_tier?: string;
  quality_grade?: string;
}): Promise<Entitlement[]> {
  let items = loadEntitlements();
  const evaluations = loadEvaluations();

  if (params?.search) {
    const s = params.search.toLowerCase();
    items = items.filter(
      (e) => e.name.toLowerCase().includes(s) || e.description.toLowerCase().includes(s),
    );
  }

  if (params?.risk_tier || params?.quality_grade) {
    items = items.filter((e) => {
      const latestEval = evaluations
        .filter((ev) => ev.entitlement_id === e.id)
        .sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at))[0];
      if (!latestEval) return false;
      if (params?.risk_tier && latestEval.risk_tier !== params.risk_tier) return false;
      if (params?.quality_grade && latestEval.quality_grade !== params.quality_grade) return false;
      return true;
    });
  }

  return items;
}

export async function getEntitlement(id: string): Promise<Entitlement> {
  const ent = loadEntitlements().find((e) => e.id === id);
  if (!ent) throw new Error("Entitlement not found");
  return ent;
}

export async function deleteEntitlement(id: string): Promise<void> {
  const entitlements = loadEntitlements().filter((e) => e.id !== id);
  saveEntitlements(entitlements);
  const evaluations = loadEvaluations().filter((e) => e.entitlement_id !== id);
  saveEvaluations(evaluations);
}

export async function getEvaluationHistory(entitlementId: string): Promise<Evaluation[]> {
  return loadEvaluations()
    .filter((e) => e.entitlement_id === entitlementId)
    .sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at));
}

export async function getSummary(): Promise<SummaryReport> {
  const entitlements = loadEntitlements();
  const evaluations = loadEvaluations();

  const latestEvals = new Map<string, Evaluation>();
  for (const ev of evaluations) {
    const existing = latestEvals.get(ev.entitlement_id);
    if (!existing || ev.evaluated_at > existing.evaluated_at) {
      latestEvals.set(ev.entitlement_id, ev);
    }
  }

  const evalsList = Array.from(latestEvals.values());
  const totalScore = evalsList.reduce((s, e) => s + e.final_score, 0);

  const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const tierCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const ev of evalsList) {
    gradeCounts[ev.quality_grade] = (gradeCounts[ev.quality_grade] || 0) + 1;
    tierCounts[ev.risk_tier] = (tierCounts[ev.risk_tier] || 0) + 1;
  }

  const total = evalsList.length || 1;
  return {
    total_entitlements: entitlements.length,
    evaluated_count: evalsList.length,
    average_score: evalsList.length > 0 ? Math.round((totalScore / total) * 100) / 100 : 0,
    quality_distribution: Object.entries(gradeCounts).map(([grade, count]) => ({
      grade, count, percentage: Math.round((count / total) * 1000) / 10,
    })),
    tier_distribution: Object.entries(tierCounts).map(([tier, count]) => ({
      tier, count, percentage: Math.round((count / total) * 1000) / 10,
    })),
  };
}
