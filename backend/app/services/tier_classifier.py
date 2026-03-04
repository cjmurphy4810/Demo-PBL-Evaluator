"""
Tier Classifier — Signal-based classification of entitlements by business criticality / audit risk.

Tiers:
- critical (level 1): Admin/full access to production, PII/financial data
- high (level 2): Write access to production, sensitive data, cross-system
- medium (level 3): Read access to production, write to non-prod
- low (level 4): Read-only non-sensitive, internal tools
"""

from app.models.entitlement import Entitlement

CRITICAL_KEYWORDS = [
    "production", "prod", "pii", "financial", "payment", "credential",
    "secret", "root", "infrastructure", "superuser", "master", "admin-all",
    "customer-data", "healthcare", "hipaa", "pci", "sox", "gdpr",
    "encryption-key", "signing-key", "private-key",
]

HIGH_KEYWORDS = [
    "staging", "sensitive", "internal-api", "service-account",
    "cross-system", "database", "data-warehouse", "analytics",
    "monitoring", "logging", "ci-cd", "pipeline", "deploy",
    "container-registry", "artifact", "backup",
]

BROAD_SCOPE_KEYWORDS = [
    "all", "unlimited", "unrestricted", "wildcard", "*",
    "everything", "full-scope", "global",
]

ACCESS_WEIGHTS = {
    "admin": 40,
    "full": 40,
    "superadmin": 45,
    "write": 25,
    "read-write": 30,
    "execute": 20,
    "read": 10,
    "view": 5,
    "list": 5,
}


def classify_risk_tier(
    entitlement: Entitlement,
    llm_risk_assessment: str | None = None,
) -> str:
    """
    Classify an entitlement into a risk tier based on signals.

    Returns: "critical", "high", "medium", or "low"
    """
    score = 0

    # 1. Access level signals
    access_level = entitlement.access_level.lower().strip()
    score += ACCESS_WEIGHTS.get(access_level, 15)

    # 2. Resource sensitivity signals
    combined_text = (
        f"{entitlement.description} {entitlement.resource_name} "
        f"{entitlement.resource_type} {entitlement.name}"
    ).lower()

    has_critical = any(kw in combined_text for kw in CRITICAL_KEYWORDS)
    has_high = any(kw in combined_text for kw in HIGH_KEYWORDS)

    if has_critical:
        score += 30
    elif has_high:
        score += 20

    # 3. Broad scope signals
    has_broad_scope = any(kw in combined_text for kw in BROAD_SCOPE_KEYWORDS)
    if has_broad_scope:
        score += 15

    # 4. Missing safeguards escalation
    if not entitlement.conditions or not entitlement.conditions.strip():
        score += 10
    if (
        not entitlement.business_justification
        or not entitlement.business_justification.strip()
    ):
        score += 5

    # 5. LLM risk assessment override (if available)
    if llm_risk_assessment:
        llm_tier = llm_risk_assessment.lower().strip()
        if llm_tier == "critical":
            score = max(score, 70)
        elif llm_tier == "high":
            score = max(score, 45)

    # 6. Tier mapping
    if score >= 60:
        return "critical"
    elif score >= 40:
        return "high"
    elif score >= 20:
        return "medium"
    else:
        return "low"


def get_tier_metadata(tier: str) -> dict:
    """Get metadata for a given tier."""
    metadata = {
        "critical": {
            "level": 1,
            "color": "#DC2626",
            "review_frequency": "monthly",
            "approval_required": True,
            "description": (
                "Admin/full access to production systems, PII/financial data access, "
                "infrastructure-level permissions. Requires monthly recertification."
            ),
        },
        "high": {
            "level": 2,
            "color": "#F59E0B",
            "review_frequency": "quarterly",
            "approval_required": True,
            "description": (
                "Write access to production, access to sensitive data, "
                "cross-system service accounts. Requires quarterly recertification."
            ),
        },
        "medium": {
            "level": 3,
            "color": "#3B82F6",
            "review_frequency": "semi-annually",
            "approval_required": False,
            "description": (
                "Read access to production, write access to non-prod, "
                "standard business application access."
            ),
        },
        "low": {
            "level": 4,
            "color": "#10B981",
            "review_frequency": "annually",
            "approval_required": False,
            "description": (
                "Read-only access to non-sensitive systems, documentation wikis, "
                "internal tools. Annual self-certification."
            ),
        },
    }
    return metadata.get(tier, metadata["medium"])
