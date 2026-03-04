import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entitlement import Entitlement, Evaluation
from app.schemas.entitlement import EntitlementCreate, EntitlementUpdate


def create_entitlement(db: Session, data: EntitlementCreate) -> Entitlement:
    entitlement = Entitlement(**data.model_dump())
    db.add(entitlement)
    db.commit()
    db.refresh(entitlement)
    return entitlement


def get_entitlement(db: Session, entitlement_id: uuid.UUID) -> Entitlement | None:
    return db.get(Entitlement, entitlement_id)


def list_entitlements(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    risk_tier: str | None = None,
    quality_grade: str | None = None,
    search: str | None = None,
) -> list[Entitlement]:
    query = select(Entitlement)

    if search:
        query = query.where(
            Entitlement.name.ilike(f"%{search}%")
            | Entitlement.description.ilike(f"%{search}%")
        )

    # Filter by latest evaluation's risk tier or quality grade
    if risk_tier or quality_grade:
        latest_eval = (
            select(
                Evaluation.entitlement_id,
                func.max(Evaluation.evaluated_at).label("max_eval"),
            )
            .group_by(Evaluation.entitlement_id)
            .subquery()
        )
        query = query.join(
            latest_eval, Entitlement.id == latest_eval.c.entitlement_id
        ).join(
            Evaluation,
            (Evaluation.entitlement_id == latest_eval.c.entitlement_id)
            & (Evaluation.evaluated_at == latest_eval.c.max_eval),
        )
        if risk_tier:
            query = query.where(Evaluation.risk_tier == risk_tier)
        if quality_grade:
            query = query.where(Evaluation.quality_grade == quality_grade)

    query = query.order_by(Entitlement.updated_at.desc()).offset(skip).limit(limit)
    return list(db.scalars(query).all())


def update_entitlement(
    db: Session, entitlement_id: uuid.UUID, data: EntitlementUpdate
) -> Entitlement | None:
    entitlement = db.get(Entitlement, entitlement_id)
    if not entitlement:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entitlement, key, value)
    db.commit()
    db.refresh(entitlement)
    return entitlement


def delete_entitlement(db: Session, entitlement_id: uuid.UUID) -> bool:
    entitlement = db.get(Entitlement, entitlement_id)
    if not entitlement:
        return False
    db.delete(entitlement)
    db.commit()
    return True


def get_evaluations_for_entitlement(
    db: Session, entitlement_id: uuid.UUID
) -> list[Evaluation]:
    query = (
        select(Evaluation)
        .where(Evaluation.entitlement_id == entitlement_id)
        .order_by(Evaluation.evaluated_at.desc())
    )
    return list(db.scalars(query).all())
