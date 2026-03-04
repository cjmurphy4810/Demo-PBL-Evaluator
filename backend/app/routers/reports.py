from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entitlement import Entitlement, Evaluation
from app.schemas.entitlement import (
    QualityDistribution,
    SummaryReport,
    TierDistribution,
)

router = APIRouter()


@router.get("/summary", response_model=SummaryReport)
def get_summary(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count(Entitlement.id))) or 0

    # Get latest evaluations (one per entitlement)
    latest_eval_sq = (
        select(
            Evaluation.entitlement_id,
            func.max(Evaluation.evaluated_at).label("max_eval"),
        )
        .group_by(Evaluation.entitlement_id)
        .subquery()
    )
    latest_evals = (
        db.execute(
            select(Evaluation).join(
                latest_eval_sq,
                (Evaluation.entitlement_id == latest_eval_sq.c.entitlement_id)
                & (Evaluation.evaluated_at == latest_eval_sq.c.max_eval),
            )
        )
        .scalars()
        .all()
    )

    evaluated_count = len(latest_evals)
    avg_score = (
        sum(e.final_score for e in latest_evals) / evaluated_count
        if evaluated_count > 0
        else 0.0
    )

    # Quality distribution
    grade_counts: dict[str, int] = {}
    tier_counts: dict[str, int] = {}
    for ev in latest_evals:
        grade_counts[ev.quality_grade] = grade_counts.get(ev.quality_grade, 0) + 1
        tier_counts[ev.risk_tier] = tier_counts.get(ev.risk_tier, 0) + 1

    quality_dist = [
        QualityDistribution(
            grade=g,
            count=c,
            percentage=round(c / evaluated_count * 100, 1) if evaluated_count else 0,
        )
        for g, c in sorted(grade_counts.items())
    ]

    tier_dist = [
        TierDistribution(
            tier=t,
            count=c,
            percentage=round(c / evaluated_count * 100, 1) if evaluated_count else 0,
        )
        for t, c in sorted(tier_counts.items())
    ]

    return SummaryReport(
        total_entitlements=total,
        evaluated_count=evaluated_count,
        average_score=round(avg_score, 1),
        quality_distribution=quality_dist,
        tier_distribution=tier_dist,
    )
