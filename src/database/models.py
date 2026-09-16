from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from src.database.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    incident_key = Column(
        String(100),
        unique=True,
        nullable=False,
    )

    title = Column(
        String(500),
        nullable=False,
    )

    status = Column(
        String(30),
        nullable=False,
        default="ACTIVE",
    )

    risk_score = Column(
        Float,
        default=0,
    )

    risk_level = Column(
        String(20),
        default="LOW",
    )

    signal_count = Column(
        BigInteger,
        default=0,
    )

    platforms = Column(
        JSONB,
        default=list,
    )

    locations = Column(
        JSONB,
        default=list,
    )

    organizations = Column(
        JSONB,
        default=list,
    )

    entities = Column(
        JSONB,
        default=list,
    )

    first_detected = Column(
        DateTime(timezone=True),
    )

    last_updated = Column(
        DateTime(timezone=True),
    )

    created_at = Column(
        DateTime(timezone=True),
    )

    signals = relationship(
        "Signal",
        back_populates="incident",
    )

    alerts = relationship(
        "Alert",
        back_populates="incident",
    )


class Signal(Base):
    __tablename__ = "signals"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    text = Column(
        Text,
        nullable=False,
    )

    platform = Column(
        String(50),
        nullable=False,
    )

    timestamp = Column(
        DateTime(timezone=True),
    )

    author = Column(
        String(255),
    )

    post_id = Column(
        String(255),
    )

    url = Column(
        Text,
    )

    risk_score = Column(
        Float,
    )

    risk_level = Column(
        String(20),
    )

    prediction = Column(
        String(100),
    )

    confidence = Column(
        Float,
    )

    severity_terms = Column(
        JSONB,
        default=list,
    )

    urgency_terms = Column(
        JSONB,
        default=list,
    )

    entities = Column(
        JSONB,
        default=list,
    )

    locations = Column(
        JSONB,
        default=list,
    )

    organizations = Column(
        JSONB,
        default=list,
    )

    people = Column(
        JSONB,
        default=list,
    )

    quantities = Column(
        JSONB,
        default=list,
    )

    risk_entities = Column(
        JSONB,
        default=list,
    )

    entity_risk_bonus = Column(
        Float,
        default=0,
    )

    context = Column(
        JSONB,
        default=dict,
    )

    explanation = Column(
        JSONB,
        default=dict,
    )

    incident_id = Column(
        BigInteger,
        ForeignKey(
            "incidents.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    incident = relationship(
        "Incident",
        back_populates="signals",
    )

    created_at = Column(
        DateTime(timezone=True),
    )

    __table_args__ = (
        UniqueConstraint(
            "platform",
            "post_id",
            name="uq_signal_platform_post",
        ),
    )

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    alert_key = Column(
        String(100),
        unique=True,
        nullable=False,
    )

    incident_id = Column(
        BigInteger,
        ForeignKey(
            "incidents.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    severity = Column(
        String(20),
        nullable=False,
    )

    title = Column(
        String(500),
        nullable=False,
    )

    message = Column(
        Text,
        nullable=False,
    )

    status = Column(
        String(30),
        nullable=False,
        default="OPEN",
    )

    created_at = Column(
        DateTime(timezone=True),
    )

    acknowledged_at = Column(
        DateTime(timezone=True),
    )

    incident = relationship(
        "Incident",
        back_populates="alerts",
    )

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="ANALYST")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True))