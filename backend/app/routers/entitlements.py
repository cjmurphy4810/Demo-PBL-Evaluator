import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.entitlement import (
    EntitlementCreate,
    EntitlementResponse,
    EntitlementUpdate,
    EvaluationResponse,
)
from app.services import entitlement_service

router = APIRouter()


@router.post("", response_model=EntitlementResponse, status_code=201)
def create_entitlement(data: EntitlementCreate, db: Session = Depends(get_db)):
    return entitlement_service.create_entitlement(db, data)


@router.get("", response_model=list[EntitlementResponse])
def list_entitlements(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    risk_tier: str | None = None,
    quality_grade: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    return entitlement_service.list_entitlements(
        db, skip=skip, limit=limit, risk_tier=risk_tier,
        quality_grade=quality_grade, search=search,
    )


@router.get("/{entitlement_id}", response_model=EntitlementResponse)
def get_entitlement(entitlement_id: uuid.UUID, db: Session = Depends(get_db)):
    entitlement = entitlement_service.get_entitlement(db, entitlement_id)
    if not entitlement:
        raise HTTPException(status_code=404, detail="Entitlement not found")
    return entitlement


@router.put("/{entitlement_id}", response_model=EntitlementResponse)
def update_entitlement(
    entitlement_id: uuid.UUID,
    data: EntitlementUpdate,
    db: Session = Depends(get_db),
):
    entitlement = entitlement_service.update_entitlement(db, entitlement_id, data)
    if not entitlement:
        raise HTTPException(status_code=404, detail="Entitlement not found")
    return entitlement


@router.delete("/{entitlement_id}", status_code=204)
def delete_entitlement(entitlement_id: uuid.UUID, db: Session = Depends(get_db)):
    if not entitlement_service.delete_entitlement(db, entitlement_id):
        raise HTTPException(status_code=404, detail="Entitlement not found")


@router.get("/{entitlement_id}/evaluations", response_model=list[EvaluationResponse])
def get_evaluation_history(entitlement_id: uuid.UUID, db: Session = Depends(get_db)):
    entitlement = entitlement_service.get_entitlement(db, entitlement_id)
    if not entitlement:
        raise HTTPException(status_code=404, detail="Entitlement not found")
    evaluations = entitlement_service.get_evaluations_for_entitlement(db, entitlement_id)
    # Transform evaluations to include dimensions
    results = []
    for ev in evaluations:
        results.append(_evaluation_to_response(ev))
    return results


def _evaluation_to_response(ev) -> dict:
    return {
        "id": ev.id,
        "entitlement_id": ev.entitlement_id,
        "rule_score": ev.rule_score,
        "llm_score": ev.llm_score,
        "final_score": ev.final_score,
        "quality_grade": ev.quality_grade,
        "risk_tier": ev.risk_tier,
        "dimensions": {
            "readability": ev.reading_ease,
            "completeness": ev.completeness_score,
            "clarity": 100.0 - (ev.jargon_count * 5 + ev.passive_voice_ratio * 2),
            "specificity": ev.rule_score,  # approximation from rule score
            "consistency": ev.rule_score,  # approximation from rule score
            "actionability": ev.actionability_score,
        },
        "flags": ev.flags or [],
        "recommendations": ev.recommendations or [],
        "evaluation_method": ev.evaluation_method,
        "evaluated_at": ev.evaluated_at,
    }
