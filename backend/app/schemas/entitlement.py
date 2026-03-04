import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# --- Entitlement Schemas ---


class EntitlementCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    resource_type: str = Field(..., min_length=1, max_length=100)
    resource_name: str = Field(..., min_length=1, max_length=255)
    access_level: str = Field(..., min_length=1, max_length=50)
    conditions: str | None = None
    business_justification: str | None = None
    owner: str | None = None
    source: str = "manual"


class EntitlementUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    resource_type: str | None = None
    resource_name: str | None = None
    access_level: str | None = None
    conditions: str | None = None
    business_justification: str | None = None
    owner: str | None = None


class EntitlementResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    resource_type: str
    resource_name: str
    access_level: str
    conditions: str | None
    business_justification: str | None
    owner: str | None
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Evaluation Schemas ---


class EvaluationDimensions(BaseModel):
    readability: float
    completeness: float
    clarity: float
    specificity: float
    consistency: float
    actionability: float | None = None


class EvaluationResponse(BaseModel):
    id: uuid.UUID
    entitlement_id: uuid.UUID
    rule_score: float
    llm_score: float | None
    final_score: float
    quality_grade: str
    risk_tier: str
    dimensions: EvaluationDimensions
    flags: list[str]
    recommendations: list[str]
    evaluation_method: str
    evaluated_at: datetime

    model_config = {"from_attributes": True}


class EvaluateRequest(BaseModel):
    """Inline evaluation request — creates entitlement and evaluates in one call."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    resource_type: str = Field(..., min_length=1, max_length=100)
    resource_name: str = Field(..., min_length=1, max_length=255)
    access_level: str = Field(..., min_length=1, max_length=50)
    conditions: str | None = None
    business_justification: str | None = None
    owner: str | None = None


class EvaluateResponse(BaseModel):
    entitlement_id: uuid.UUID
    evaluation: EvaluationResponse


# --- Risk Tier Config Schemas ---


class RiskTierConfigResponse(BaseModel):
    id: uuid.UUID
    tier_name: str
    tier_level: int
    criteria: dict
    color: str
    review_frequency: str
    approval_required: bool
    description: str

    model_config = {"from_attributes": True}


class RiskTierConfigUpdate(BaseModel):
    criteria: dict | None = None
    color: str | None = None
    review_frequency: str | None = None
    approval_required: bool | None = None
    description: str | None = None


# --- Report Schemas ---


class QualityDistribution(BaseModel):
    grade: str
    count: int
    percentage: float


class TierDistribution(BaseModel):
    tier: str
    count: int
    percentage: float


class SummaryReport(BaseModel):
    total_entitlements: int
    evaluated_count: int
    average_score: float
    quality_distribution: list[QualityDistribution]
    tier_distribution: list[TierDistribution]
