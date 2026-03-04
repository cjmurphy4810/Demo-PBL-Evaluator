import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Entitlement(Base):
    __tablename__ = "entitlements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_name: Mapped[str] = mapped_column(String(255), nullable=False)
    access_level: Mapped[str] = mapped_column(String(50), nullable=False)
    conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_justification: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="manual")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    evaluations: Mapped[list["Evaluation"]] = relationship(
        back_populates="entitlement", cascade="all, delete-orphan"
    )


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    entitlement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("entitlements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Rule engine scores
    rule_score: Mapped[float] = mapped_column(Float, nullable=False)
    readability_grade: Mapped[float] = mapped_column(Float, nullable=False)
    reading_ease: Mapped[float] = mapped_column(Float, nullable=False)
    gunning_fog: Mapped[float] = mapped_column(Float, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False)
    sentence_count: Mapped[int] = mapped_column(Integer, nullable=False)
    avg_sentence_length: Mapped[float] = mapped_column(Float, nullable=False)
    passive_voice_ratio: Mapped[float] = mapped_column(Float, default=0.0)
    jargon_count: Mapped[int] = mapped_column(Integer, default=0)
    completeness_score: Mapped[float] = mapped_column(Float, nullable=False)

    # LLM scores (nullable)
    llm_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    clarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    specificity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    actionability_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    consistency_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Final composite
    final_score: Mapped[float] = mapped_column(Float, nullable=False)
    quality_grade: Mapped[str] = mapped_column(String(2), nullable=False)
    risk_tier: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    flags: Mapped[list] = mapped_column(JSON, default=list)
    recommendations: Mapped[list] = mapped_column(JSON, default=list)

    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    evaluation_method: Mapped[str] = mapped_column(String(20), default="rules_only")

    entitlement: Mapped["Entitlement"] = relationship(back_populates="evaluations")


class RiskTierConfig(Base):
    __tablename__ = "risk_tier_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tier_name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    tier_level: Mapped[int] = mapped_column(Integer, nullable=False)
    criteria: Mapped[dict] = mapped_column(JSON, default=dict)
    color: Mapped[str] = mapped_column(String(7), nullable=False)
    review_frequency: Mapped[str] = mapped_column(String(20), nullable=False)
    approval_required: Mapped[bool] = mapped_column(default=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
