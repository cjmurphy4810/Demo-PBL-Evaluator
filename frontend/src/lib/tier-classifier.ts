// Client-side tier classifier — mirrors backend/app/services/tier_classifier.py

const CRITICAL_KEYWORDS = [
  "production", "pii", "financial", "payment", "credential", "secret", "root",
  "admin-all", "customer-data", "healthcare", "hipaa", "pci", "sox", "gdpr",
  "encryption-key",
];

const HIGH_KEYWORDS = [
  "staging", "sensitive", "internal-api", "service-account", "cross-system",
  "database", "data-warehouse", "analytics", "monitoring", "logging", "ci-cd",
  "deploy", "container-registry",
];

const BROAD_SCOPE_KEYWORDS = [
  "all", "unlimited", "unrestricted", "*", "everything", "full-scope", "global",
];

export interface TierResult {
  tier: string;
  tier_level: number;
  color: string;
  review_frequency: string;
  approval_required: boolean;
}

const TIER_META: Record<string, Omit<TierResult, "tier">> = {
  critical: { tier_level: 1, color: "#DC2626", review_frequency: "monthly", approval_required: true },
  high: { tier_level: 2, color: "#F59E0B", review_frequency: "quarterly", approval_required: true },
  medium: { tier_level: 3, color: "#3B82F6", review_frequency: "semi-annual", approval_required: false },
  low: { tier_level: 4, color: "#10B981", review_frequency: "annual", approval_required: false },
};

export function classifyTier(data: {
  access_level: string;
  resource_name: string;
  resource_type: string;
  description: string;
  conditions?: string | null;
  business_justification?: string | null;
}): TierResult {
  let score = 0;
  const searchText = [
    data.access_level, data.resource_name, data.resource_type,
    data.description, data.conditions, data.business_justification,
  ].filter(Boolean).join(" ").toLowerCase();

  // Access level scoring
  const al = data.access_level.toLowerCase();
  if (["superadmin", "admin", "full"].some((k) => al.includes(k))) score += 40;
  else if (al.includes("read-write")) score += 30;
  else if (al.includes("execute")) score += 25;
  else if (al.includes("write")) score += 20;
  else if (al.includes("list")) score += 10;
  else if (["read", "view"].some((k) => al.includes(k))) score += 5;

  // Resource sensitivity
  for (const kw of CRITICAL_KEYWORDS) {
    if (searchText.includes(kw)) { score += 30; break; }
  }
  for (const kw of HIGH_KEYWORDS) {
    if (searchText.includes(kw)) { score += 20; break; }
  }

  // Broad scope
  for (const kw of BROAD_SCOPE_KEYWORDS) {
    if (searchText.includes(kw)) { score += 15; break; }
  }

  // Missing safeguards
  if (!data.conditions) score += 10;
  if (!data.business_justification) score += 5;

  // Map to tier
  let tier: string;
  if (score >= 60) tier = "critical";
  else if (score >= 40) tier = "high";
  else if (score >= 20) tier = "medium";
  else tier = "low";

  return { tier, ...TIER_META[tier] };
}
