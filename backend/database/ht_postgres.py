import os
from contextlib import contextmanager
from datetime import datetime
from enum import Enum as PyEnum
from typing import Iterator

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship
from sqlalchemy.sql import func


class DBSkeleton(DeclarativeBase):
    pass

class FlowStatus(PyEnum):
    TESTS_NOT_GENERATED = "tests_not_generated"
    TESTS_GENERATED = "tests_generated"
    AGENT_READY = "agent_ready"
    AGENT_RUNNING = "agent_running"

class AgentRunStatus(PyEnum):
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"

class ScheduleType(PyEnum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"


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
        Enum(FlowStatus, name="flow_status", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=FlowStatus.TESTS_NOT_GENERATED,
    )

    created_at: Mapped[datetime] = mapped_column( DateTime(timezone=True), server_default=func.now(), nullable=False)

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user: Mapped["UserTable"] = relationship(back_populates="flows")

    generated_recipe: Mapped["GeneratedRecipeTable | None"] = relationship(back_populates="flow", uselist=False, cascade="all, delete-orphan")


class GeneratedRecipeTable(DBSkeleton):
    __tablename__ = "generated_recipes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flow_id: Mapped[str] = mapped_column(
        ForeignKey("flows.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    agent_recipe: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    flow: Mapped["FlowsTable"] = relationship(back_populates="generated_recipe")


class AgentRunTable(DBSkeleton):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    flow_id: Mapped[str] = mapped_column(
        ForeignKey("flows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    triggered_by: Mapped[str] = mapped_column(String(20), nullable=False)  # "manual" or "scheduled"
    status: Mapped[AgentRunStatus] = mapped_column(
        Enum(AgentRunStatus, name="agent_run_status", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=AgentRunStatus.RUNNING,
    )
    report: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON report
    ran_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AgentScheduleTable(DBSkeleton):
    __tablename__ = "agent_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flow_id: Mapped[str] = mapped_column(
        ForeignKey("flows.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    schedule_type: Mapped[ScheduleType] = mapped_column(
        Enum(ScheduleType, name="schedule_type", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=ScheduleType.NONE,
    )
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class FlowSecretTable(DBSkeleton):
    __tablename__ = "flow_secrets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flow_id: Mapped[str] = mapped_column(
        ForeignKey("flows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False, default="")


class PostgresDB:
    def __init__(self, database_url: str):
        self.db_url = database_url
        self.engine = create_engine(self.db_url, pool_pre_ping=True)

    def ensure_schema(self) -> None:
        """Create missing tables and enum values for partially initialized dev DBs."""
        with self.engine.begin() as connection:
            connection.execute(text("""
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'flow_status') THEN
                        ALTER TYPE flow_status ADD VALUE IF NOT EXISTS 'agent_ready';
                        ALTER TYPE flow_status ADD VALUE IF NOT EXISTS 'agent_running';
                    END IF;
                END $$;
            """))

        DBSkeleton.metadata.create_all(self.engine)

    @contextmanager
    def get_session(self) -> Iterator[Session]:
        session = Session(self.engine)
        try:
            yield session
        finally:
            session.close()
