import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.entitlement import EvaluateRequest, EvaluateResponse, EntitlementCreate
from app.services import entitlement_service
from app.services.evaluation_pipeline import evaluate_entitlement

router = APIRouter()


@router.post("", response_model=EvaluateResponse)
def evaluate_inline(data: EvaluateRequest, db: Session = Depends(get_db)):
    """Create an entitlement and evaluate it in a single call."""
    # Create the entitlement
    create_data = EntitlementCreate(
        name=data.name,
        description=data.description,
        resource_type=data.resource_type,
        resource_name=data.resource_name,
        access_level=data.access_level,
        conditions=data.conditions,
        business_justification=data.business_justification,
        owner=data.owner,
    )
    entitlement = entitlement_service.create_entitlement(db, create_data)

    # Run evaluation
    evaluation = evaluate_entitlement(db, entitlement)

    return EvaluateResponse(
        entitlement_id=entitlement.id,
        evaluation=evaluation,
    )


@router.post("/{entitlement_id}", response_model=EvaluateResponse)
def evaluate_existing(entitlement_id: uuid.UUID, db: Session = Depends(get_db)):
    """Re-evaluate an existing entitlement."""
    entitlement = entitlement_service.get_entitlement(db, entitlement_id)
    if not entitlement:
        raise HTTPException(status_code=404, detail="Entitlement not found")

    evaluation = evaluate_entitlement(db, entitlement)

    return EvaluateResponse(
        entitlement_id=entitlement.id,
        evaluation=evaluation,
    )
