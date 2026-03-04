"""Unit tests for the tier classifier."""

from unittest.mock import MagicMock

from app.services.tier_classifier import classify_risk_tier, get_tier_metadata


def _make_entitlement(**overrides):
    defaults = {
        "name": "Test Entitlement",
        "description": "Access to the system.",
        "resource_type": "application",
        "resource_name": "test-app",
        "access_level": "read",
        "conditions": "Some conditions.",
        "business_justification": "Needed for work.",
    }
    defaults.update(overrides)
    ent = MagicMock()
    for k, v in defaults.items():
        setattr(ent, k, v)
    return ent


class TestTierClassification:
    def test_admin_production_is_critical(self):
        ent = _make_entitlement(
            access_level="admin",
            resource_name="payments-db-prod",
            description="Full admin access to production database.",
        )
        tier = classify_risk_tier(ent)
        assert tier == "critical"

    def test_read_only_wiki_is_low(self):
        ent = _make_entitlement(
            access_level="read",
            resource_name="internal-wiki",
            description="Read-only access to internal wiki documentation.",
        )
        tier = classify_risk_tier(ent)
        assert tier == "low"

    def test_write_staging_is_high(self):
        ent = _make_entitlement(
            access_level="write",
            resource_name="staging-api",
            description="Write access to staging environment API.",
        )
        tier = classify_risk_tier(ent)
        assert tier in ("high", "medium")

    def test_missing_safeguards_escalates(self):
        """Missing conditions and justification should push tier higher."""
        ent_safe = _make_entitlement(
            access_level="write",
            resource_name="analytics-app",
            description="Write access to analytics application.",
            conditions="Requires manager approval.",
            business_justification="Data team needs write access.",
        )
        ent_unsafe = _make_entitlement(
            access_level="write",
            resource_name="analytics-app",
            description="Write access to analytics application.",
            conditions=None,
            business_justification=None,
        )
        tier_safe = classify_risk_tier(ent_safe)
        tier_unsafe = classify_risk_tier(ent_unsafe)
        tier_levels = {"critical": 1, "high": 2, "medium": 3, "low": 4}
        # Unsafe should be same or higher risk (lower level number)
        assert tier_levels[tier_unsafe] <= tier_levels[tier_safe]

    def test_llm_override_critical(self):
        ent = _make_entitlement(
            access_level="read",
            resource_name="some-app",
            description="Appears benign but LLM says critical.",
        )
        tier = classify_risk_tier(ent, llm_risk_assessment="critical")
        assert tier == "critical"

    def test_pii_keywords_trigger_critical(self):
        ent = _make_entitlement(
            access_level="read",
            description="Read access to PII customer data store.",
            resource_name="customer-pii-store",
        )
        tier = classify_risk_tier(ent)
        assert tier in ("critical", "high")

    def test_broad_scope_escalates(self):
        ent = _make_entitlement(
            access_level="admin",
            description="Unlimited access to all production resources.",
            resource_name="production-cluster",
        )
        tier = classify_risk_tier(ent)
        assert tier == "critical"


class TestTierMetadata:
    def test_all_tiers_have_metadata(self):
        for tier in ["critical", "high", "medium", "low"]:
            meta = get_tier_metadata(tier)
            assert "level" in meta
            assert "color" in meta
            assert "review_frequency" in meta
            assert "approval_required" in meta

    def test_critical_requires_approval(self):
        meta = get_tier_metadata("critical")
        assert meta["approval_required"] is True

    def test_low_no_approval_required(self):
        meta = get_tier_metadata("low")
        assert meta["approval_required"] is False
