"""Unit tests for the evaluation pipeline scoring and grade logic."""

from app.services.evaluation_pipeline import compute_quality_grade, should_trigger_llm
from app.services.rule_engine import RuleEngineResult


class TestQualityGrade:
    def test_grade_a(self):
        assert compute_quality_grade(95) == "A"
        assert compute_quality_grade(90) == "A"

    def test_grade_b(self):
        assert compute_quality_grade(89) == "B"
        assert compute_quality_grade(75) == "B"

    def test_grade_c(self):
        assert compute_quality_grade(74) == "C"
        assert compute_quality_grade(60) == "C"

    def test_grade_d(self):
        assert compute_quality_grade(59) == "D"
        assert compute_quality_grade(40) == "D"

    def test_grade_f(self):
        assert compute_quality_grade(39) == "F"
        assert compute_quality_grade(0) == "F"


class TestLLMTrigger:
    def test_low_score_triggers(self):
        result = RuleEngineResult()
        result.rule_score = 50.0
        result.flags = []
        assert should_trigger_llm(result) is True

    def test_high_score_no_flags_does_not_trigger(self):
        result = RuleEngineResult()
        result.rule_score = 90.0
        result.flags = ["text_too_short"]  # not a critical flag
        assert should_trigger_llm(result) is False

    def test_critical_flag_triggers_regardless_of_score(self):
        result = RuleEngineResult()
        result.rule_score = 95.0
        result.flags = ["missing_conditions"]
        assert should_trigger_llm(result) is True

    def test_jargon_flag_triggers(self):
        result = RuleEngineResult()
        result.rule_score = 85.0
        result.flags = ["jargon_detected"]
        assert should_trigger_llm(result) is True
