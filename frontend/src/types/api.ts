export interface Entitlement {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  resource_name: string;
  access_level: string;
  conditions: string | null;
  business_justification: string | null;
  owner: string | null;
  roles: string[];
  divisions: string[];
  source: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationDimensions {
  readability: number;
  completeness: number;
  clarity: number;
  specificity: number;
  consistency: number;
  actionability: number | null;
}

export interface RbacDimensions {
  title_description_alignment: number;
  role_appropriateness: number;
  division_relevance: number;
  separation_of_duties: number;
  scope_definition: number;
}

export interface Evaluation {
  id: string;
  entitlement_id: string;
  rule_score: number;
  llm_score: number | null;
  final_score: number;
  quality_grade: string;
  risk_tier: string;
  dimensions: EvaluationDimensions;
  flags: string[];
  recommendations: string[];
  evaluation_method: string;
  evaluated_at: string;
}

export interface RbacEvaluation {
  id: string;
  entitlement_id: string;
  final_score: number;
  quality_grade: string;
  risk_tier: string;
  dimensions: RbacDimensions;
  flags: string[];
  recommendations: string[];
  findings: RbacFinding[];
  evaluation_method: string;
  evaluated_at: string;
}

export interface RbacFinding {
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  description: string;
  recommendation: string;
}

export interface EvaluateRequest {
  name: string;
  description: string;
  resource_type: string;
  resource_name: string;
  access_level: string;
  conditions?: string;
  business_justification?: string;
  owner?: string;
  roles?: string[];
  divisions?: string[];
}

export interface EvaluateResponse {
  entitlement_id: string;
  evaluation: Evaluation;
}

export interface RbacEvaluateResponse {
  entitlement_id: string;
  evaluation: RbacEvaluation;
}

export interface QualityDistribution {
  grade: string;
  count: number;
  percentage: number;
}

export interface TierDistribution {
  tier: string;
  count: number;
  percentage: number;
}

export interface SummaryReport {
  total_entitlements: number;
  evaluated_count: number;
  average_score: number;
  quality_distribution: QualityDistribution[];
  tier_distribution: TierDistribution[];
}

// Role and Division constants
export const ROLE_CATEGORIES = [
  "Developer",
  "Tester",
  "Tech Ops",
  "Business Tester",
  "Business Ops",
  "Business Analyst",
  "Project Manager",
  "Security Admin",
  "System Admin",
  "Database Admin",
  "Network Admin",
  "Application Support",
  "Service Desk",
  "Auditor",
  "Compliance Officer",
  "External Customer",
  "External Vendor",
  "Executive Management",
] as const;

export const DIVISION_CATEGORIES = [
  "Wholesale Banking",
  "Retail Banking",
  "Trading",
  "Consumer Lending",
  "Business Banking",
  "Credit Cards",
  "Digital Customer Experience",
  "Wealth Management",
  "Risk Management",
  "Compliance",
  "Information Technology",
  "Operations",
  "Human Resources",
  "Finance",
  "Legal",
  "Marketing",
] as const;
