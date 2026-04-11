import os
from contextlib import contextmanager
from datetime import datetime
from enum import Enum as PyEnum
from typing import Iterator

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship
from sqlalchemy.sql import func


class DBSkeleton(DeclarativeBase):
    pass

class FlowStatus(PyEnum):
    TESTS_NOT_GENERATED = "tests_not_generated"
    TESTS_GENERATED = "tests_generated"


class UserTable(DBSkeleton):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(80), nullable=False)
    company: Mapped[str] = mapped_column(String(120), nullable=False)

    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)

    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    flows: Mapped[list["FlowsTable"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    #becuase i need to access flows for each user forom user only.


class FlowsTable(DBSkeleton):
    __tablename__ = "flows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)


    flow_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fps: Mapped[int] = mapped_column(Integer, nullable=False)
    frame_count: Mapped[int] = mapped_column(Integer, nullable=False)
    event_count: Mapped[int] = mapped_column(Integer, nullable=False)
    events_path: Mapped[str] = mapped_column(Text, nullable=False)
    video_path: Mapped[str] = mapped_column(Text, nullable=False)


    status: Mapped[FlowStatus] = mapped_column(
        Enum(FlowStatus, name="flow_status"),
        nullable=False,
        default=FlowStatus.TESTS_NOT_GENERATED,
    )

    created_at: Mapped[datetime] = mapped_column( DateTime(timezone=True), server_default=func.now(), nullable=False)

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user: Mapped["UserTable"] = relationship(back_populates="flows")

    generated_test: Mapped["GeneratedTestsTable | None"] = relationship(back_populates="flow",uselist=False,cascade="all, delete-orphan",)


class GeneratedTestsTable(DBSkeleton):
    __tablename__ = "generated_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flow_id: Mapped[str] = mapped_column(
        ForeignKey("flows.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    
    bdd_text: Mapped[str] = mapped_column(Text, nullable=False)
    playwright_text: Mapped[str] = mapped_column(Text, nullable=False)
    model_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    flow: Mapped["FlowsTable"] = relationship(back_populates="generated_test")


class PostgresDB:
    def __init__(self, database_url: str, db_modelling: type[DeclarativeBase] = DBSkeleton):
        self.db_url = database_url
        self.engine = create_engine(self.db_url, pool_pre_ping=True)
        db_modelling.metadata.create_all(self.engine)

    @contextmanager
    def get_session(self) -> Iterator[Session]:
        session = Session(self.engine)
        try:
            yield session
        finally:
            session.close()

