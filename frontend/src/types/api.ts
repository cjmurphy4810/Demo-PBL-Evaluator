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

export interface EvaluateRequest {
  name: string;
  description: string;
  resource_type: string;
  resource_name: string;
  access_level: string;
  conditions?: string;
  business_justification?: string;
  owner?: string;
}

export interface EvaluateResponse {
  entitlement_id: string;
  evaluation: Evaluation;
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
