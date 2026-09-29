from sqlalchemy import Column, Integer, Text, String, Float, DateTime
from sqlalchemy.sql import func

from .database import Base


class Report(Base):
    __tablename__ = "reports"

    report_id = Column(Integer, primary_key=True, index=True)

    raw_text = Column(Text, nullable=False)

    detected_language = Column(
        String(50),
        nullable=True
    )

    normalized_text = Column(
        Text,
        nullable=True
    )

    sif_prediction = Column(
        String(10),
        nullable=True
    )

    confidence = Column(
        Float,
        nullable=True
    )

    life_saving_rule = Column(
        String(100),
        nullable=True
    )

    precursor_activity = Column(
        Text,
        nullable=True
    )

    precursor_location = Column(
        Text,
        nullable=True
    )

    barrier_failure = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )