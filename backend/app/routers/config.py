from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entitlement import RiskTierConfig
from app.schemas.entitlement import RiskTierConfigResponse, RiskTierConfigUpdate

router = APIRouter()


@router.get("/tiers", response_model=list[RiskTierConfigResponse])
def get_tier_configs(db: Session = Depends(get_db)):
    configs = db.scalars(
        select(RiskTierConfig).order_by(RiskTierConfig.tier_level)
    ).all()
    return list(configs)


@router.put("/tiers/{tier_name}", response_model=RiskTierConfigResponse)
def update_tier_config(
    tier_name: str,
    data: RiskTierConfigUpdate,
    db: Session = Depends(get_db),
):
    config = db.scalar(
        select(RiskTierConfig).where(RiskTierConfig.tier_name == tier_name)
    )
    if not config:
        raise HTTPException(status_code=404, detail=f"Tier '{tier_name}' not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config
