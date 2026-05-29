"""agent tables — recipes, runs, schedules

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PgEnum

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extend flow_status enum with agent states
    op.execute("ALTER TYPE flow_status ADD VALUE IF NOT EXISTS 'agent_ready'")
    op.execute("ALTER TYPE flow_status ADD VALUE IF NOT EXISTS 'agent_running'")

    # New enum types — DO block guards against pre-existing types from create_all
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_run_status') THEN
                CREATE TYPE agent_run_status AS ENUM ('running', 'passed', 'failed');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_type') THEN
                CREATE TYPE schedule_type AS ENUM ('none', 'daily', 'weekly');
            END IF;
        END $$;
    """)

    op.create_table(
        "agent_recipes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("flow_id", sa.String(36), nullable=False),
        sa.Column("goal", sa.Text(), nullable=False),
        sa.Column("success_criteria", sa.Text(), nullable=False),
        sa.Column("steps", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["flow_id"], ["flows.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("flow_id"),
    )
    op.create_index("ix_agent_recipes_flow_id", "agent_recipes", ["flow_id"])

    op.create_table(
        "agent_runs",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("flow_id", sa.String(36), nullable=False),
        sa.Column("triggered_by", sa.String(20), nullable=False),
        sa.Column("status", PgEnum("running", "passed", "failed", name="agent_run_status", create_type=False), nullable=False),
        sa.Column("report", sa.Text(), nullable=True),
        sa.Column("ran_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["flow_id"], ["flows.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_runs_flow_id", "agent_runs", ["flow_id"])

    op.create_table(
        "agent_schedules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("flow_id", sa.String(36), nullable=False),
        sa.Column("schedule_type", PgEnum("none", "daily", "weekly", name="schedule_type", create_type=False), nullable=False),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["flow_id"], ["agent_recipes.flow_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("flow_id"),
    )
    op.create_index("ix_agent_schedules_flow_id", "agent_schedules", ["flow_id"])


def downgrade() -> None:
    op.drop_table("agent_schedules")
    op.drop_table("agent_runs")
    op.drop_table("agent_recipes")

    sa.Enum(name="agent_run_status").drop(op.get_bind())
    sa.Enum(name="schedule_type").drop(op.get_bind())

    # PostgreSQL doesn't support removing enum values, so we recreate flow_status without agent states
    op.execute("ALTER TYPE flow_status RENAME TO flow_status_old")
    op.execute("CREATE TYPE flow_status AS ENUM ('tests_not_generated', 'tests_generated')")
    op.execute("ALTER TABLE flows ALTER COLUMN status TYPE flow_status USING status::text::flow_status")
    op.execute("DROP TYPE flow_status_old")
