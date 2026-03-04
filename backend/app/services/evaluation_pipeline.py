"""
Evaluation Pipeline — Orchestrates Rule Engine + LLM Evaluator + Tier Classifier.

Flow:
1. Run rule engine (fast pass)
2. If rule_score < threshold or critical flags → run LLM evaluation (deep pass)
3. Merge scores (weighted ensemble)
4. Classify risk tier
5. Persist evaluation result
"""

import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entitlement import Entitlement, Evaluation
from app.services.llm_evaluator import LLMResult, run_llm_evaluation
from app.services.rule_engine import RuleEngineResult, run_rule_engine
from app.services.tier_classifier import classify_risk_tier

logger = logging.getLogger(__name__)

CRITICAL_FLAGS = {
    "missing_conditions",
    "missing_business_justification",
    "jargon_detected",
    "vague_resources",
    "vague_scope",
    "inconsistent_access_level",
}


def compute_quality_grade(score: float) -> str:
    """Map a 0-100 score to a letter grade."""
    if score >= 90:
        return "A"
    elif score >= 75:
        return "B"
    elif score >= 60:
        return "C"
    elif score >= 40:
        return "D"
    else:
        return "F"


def should_trigger_llm(rule_result: RuleEngineResult) -> bool:
    """Determine if LLM evaluation should be triggered."""
    if rule_result.rule_score < settings.llm_threshold:
        return True
    # Check for critical flags
    if any(flag in CRITICAL_FLAGS for flag in rule_result.flags):
        return True
    return False


def merge_scores(
    rule_result: RuleEngineResult, llm_result: LLMResult | None
) -> float:
    """Merge rule and LLM scores using weighted ensemble."""
    if llm_result and llm_result.success:
        return (
            rule_result.rule_score * settings.rule_weight
            + llm_result.overall_score * settings.llm_weight
        )
    return rule_result.rule_score


def evaluate_entitlement(db: Session, entitlement: Entitlement) -> dict:
    """
    Run the full evaluation pipeline on an entitlement.

    Returns a dict matching EvaluationResponse schema.
    """
    # Step 1: Rule engine (fast pass)
    rule_result = run_rule_engine(entitlement)
    logger.info(
        f"Rule engine score for '{entitlement.name}': {rule_result.rule_score:.1f}"
    )

    # Step 2: LLM evaluation (deep pass) if needed
    llm_result: LLMResult | None = None
    evaluation_method = "rules_only"

    if should_trigger_llm(rule_result):
        logger.info(f"Triggering LLM evaluation for '{entitlement.name}'")
        llm_result = run_llm_evaluation(entitlement)
        if llm_result.success:
            evaluation_method = "hybrid"
        else:
            logger.warning(
                f"LLM evaluation failed for '{entitlement.name}': {llm_result.error}"
            )

    # Step 3: Merge scores
    final_score = merge_scores(rule_result, llm_result)
    quality_grade = compute_quality_grade(final_score)

    # Step 4: Classify risk tier
    llm_risk = llm_result.risk_assessment if llm_result and llm_result.success else None
    risk_tier = classify_risk_tier(entitlement, llm_risk)

    # Merge flags and recommendations from both engines
    all_flags = list(rule_result.flags)
    all_recommendations = list(rule_result.recommendations)
    if llm_result and llm_result.success:
        # Add LLM flags that aren't duplicates
        for flag in llm_result.flags:
            if flag not in all_flags:
                all_flags.append(flag)
        for rec in llm_result.recommendations:
            if rec not in all_recommendations:
                all_recommendations.append(rec)

    # Step 5: Persist evaluation
    evaluation = Evaluation(
        entitlement_id=entitlement.id,
        rule_score=rule_result.rule_score,
        readability_grade=rule_result.readability_grade,
        reading_ease=rule_result.reading_ease,
        gunning_fog=rule_result.gunning_fog,
        word_count=rule_result.word_count,
        sentence_count=rule_result.sentence_count,
        avg_sentence_length=rule_result.avg_sentence_length,
        passive_voice_ratio=rule_result.passive_voice_ratio,
        jargon_count=rule_result.jargon_count,
        completeness_score=rule_result.completeness_score,
        llm_score=llm_result.overall_score if llm_result and llm_result.success else None,
        clarity_score=(
            llm_result.clarity_score if llm_result and llm_result.success else None
        ),
        specificity_score=(
            llm_result.specificity_score if llm_result and llm_result.success else None
        ),
        actionability_score=(
            llm_result.actionability_score if llm_result and llm_result.success else None
        ),
        consistency_score=(
            llm_result.consistency_score if llm_result and llm_result.success else None
        ),
        final_score=final_score,
        quality_grade=quality_grade,
        risk_tier=risk_tier,
        flags=all_flags,
        recommendations=all_recommendations,
        evaluation_method=evaluation_method,
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    # Return response dict
    return {
        "id": evaluation.id,
        "entitlement_id": evaluation.entitlement_id,
        "rule_score": evaluation.rule_score,
        "llm_score": evaluation.llm_score,
        "final_score": evaluation.final_score,
        "quality_grade": evaluation.quality_grade,
        "risk_tier": evaluation.risk_tier,
        "dimensions": {
            "readability": rule_result.readability_score,
            "completeness": rule_result.completeness_score,
            "clarity": rule_result.clarity_score,
            "specificity": rule_result.specificity_score,
            "consistency": rule_result.consistency_score,
            "actionability": (
                llm_result.actionability_score
                if llm_result and llm_result.success
                else None
            ),
        },
        "flags": all_flags,
        "recommendations": all_recommendations,
        "evaluation_method": evaluation.evaluation_method,
        "evaluated_at": evaluation.evaluated_at,
    }
