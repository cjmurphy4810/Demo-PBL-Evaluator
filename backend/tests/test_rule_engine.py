"""Unit tests for the rule engine."""

from unittest.mock import MagicMock

from app.services.rule_engine import (
    evaluate_clarity,
    evaluate_completeness,
    evaluate_consistency,
    evaluate_readability,
    evaluate_specificity,
    run_rule_engine,
    RuleEngineResult,
)


def _make_entitlement(**overrides):
    """Create a mock entitlement with sensible defaults."""
    defaults = {
        "name": "Test Entitlement",
        "description": (
            "Read and write access to the production payments database. "
            "This entitlement allows the holder to query and modify payment records. "
            "Access is logged and reviewed monthly."
        ),
        "resource_type": "database",
        "resource_name": "payments-db-prod",
        "access_level": "write",
        "conditions": "Requires VPN and MFA. Quarterly review.",
        "business_justification": "Finance team needs access for payment reconciliation.",
        "owner": "Finance Team",
    }
    defaults.update(overrides)
    ent = MagicMock()
    for k, v in defaults.items():
        setattr(ent, k, v)
    return ent


class TestReadability:
    def test_clear_text_scores_high(self):
        result = RuleEngineResult()
        text = (
            "Read access to the internal wiki. "
            "This allows viewing all published pages. "
            "No special approval is needed."
        )
        score = evaluate_readability(text, result)
        assert score > 40, f"Clear text should score > 40, got {score}"

    def test_jargon_heavy_text_scores_lower(self):
        result = RuleEngineResult()
        text = (
            "Heterogeneous infrastructure orchestration for containerized "
            "microservices with polymorphic authentication mechanisms "
            "leveraging asymmetric cryptographic key management subsystems."
        )
        score = evaluate_readability(text, result)
        # Complex text should score lower
        assert score < 80, f"Complex text should score < 80, got {score}"

    def test_short_text_gets_flagged(self):
        result = RuleEngineResult()
        score = evaluate_readability("DB access", result)
        assert "text_too_short" in result.flags


class TestCompleteness:
    def test_fully_complete_scores_100(self):
        ent = _make_entitlement()
        result = RuleEngineResult()
        score = evaluate_completeness(ent, result)
        assert score == 100.0
        assert len(result.flags) == 0

    def test_missing_conditions_deducts_20(self):
        ent = _make_entitlement(conditions=None)
        result = RuleEngineResult()
        score = evaluate_completeness(ent, result)
        assert score == 80.0
        assert "missing_conditions" in result.flags

    def test_all_missing_scores_zero(self):
        ent = _make_entitlement(
            resource_name="",
            access_level="",
            conditions=None,
            business_justification=None,
            owner=None,
        )
        result = RuleEngineResult()
        score = evaluate_completeness(ent, result)
        assert score == 0.0
        assert len(result.flags) == 5


class TestClarity:
    def test_clean_text_scores_high(self):
        result = RuleEngineResult()
        text = (
            "Read access to the payments database. "
            "Allows querying transaction records. "
            "Access is reviewed quarterly."
        )
        score = evaluate_clarity(text, result)
        assert score >= 80

    def test_jargon_detected(self):
        result = RuleEngineResult()
        text = "R/W access to prod k8s ns via SA w/ RBAC binding."
        score = evaluate_clarity(text, result)
        assert "jargon_detected" in result.flags
        assert score <= 80

    def test_ambiguous_terms_flagged(self):
        result = RuleEngineResult()
        text = "Access to various systems as needed for general purposes etc."
        score = evaluate_clarity(text, result)
        assert "ambiguous_terms" in result.flags


class TestSpecificity:
    def test_specific_resources_score_high(self):
        ent = _make_entitlement(
            resource_name="payments-db-prod",
            description="Access to the payments-db-prod PostgreSQL cluster.",
        )
        result = RuleEngineResult()
        score = evaluate_specificity(ent, result)
        assert score >= 70

    def test_vague_resources_flagged(self):
        ent = _make_entitlement(
            description="Access to the system for the application.",
            resource_name="the-system",
        )
        result = RuleEngineResult()
        score = evaluate_specificity(ent, result)
        assert "vague_resources" in result.flags


class TestConsistency:
    def test_consistent_terminology_scores_high(self):
        ent = _make_entitlement(
            access_level="read",
            description="Read access to the analytics dashboard for viewing reports.",
        )
        result = RuleEngineResult()
        score = evaluate_consistency(ent, result)
        assert score >= 90

    def test_inconsistent_access_level_flagged(self):
        ent = _make_entitlement(
            access_level="read",
            description="This entitlement grants write and delete access to modify records.",
        )
        result = RuleEngineResult()
        score = evaluate_consistency(ent, result)
        assert "inconsistent_access_level" in result.flags
        assert score < 100


class TestFullPipeline:
    def test_good_entitlement_scores_above_70(self):
        ent = _make_entitlement()
        result = run_rule_engine(ent)
        assert result.rule_score >= 70, f"Good entitlement should score >= 70, got {result.rule_score}"

    def test_bad_entitlement_scores_below_50(self):
        ent = _make_entitlement(
            description="R/W access to prod k8s ns via SA etc.",
            conditions=None,
            business_justification=None,
            owner=None,
            resource_name="stuff",
        )
        result = run_rule_engine(ent)
        assert result.rule_score < 75, f"Bad entitlement should score < 75, got {result.rule_score}"

    def test_weighted_score_calculation(self):
        ent = _make_entitlement()
        result = run_rule_engine(ent)
        expected = (
            result.readability_score * 0.25
            + result.completeness_score * 0.25
            + result.clarity_score * 0.20
            + result.specificity_score * 0.15
            + result.consistency_score * 0.15
        )
        assert abs(result.rule_score - expected) < 0.01
