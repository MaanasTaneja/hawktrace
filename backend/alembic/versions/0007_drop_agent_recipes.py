"""drop agent_recipes

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-30
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO generated_recipes (flow_id, agent_recipe)
        SELECT
            ar.flow_id,
            json_build_object(
                'goal', ar.goal,
                'success_criteria', ar.success_criteria,
                'steps', ar.steps::json
            )::text
        FROM agent_recipes ar
        WHERE NOT EXISTS (
            SELECT 1 FROM generated_recipes gr WHERE gr.flow_id = ar.flow_id
        )
    """)

    op.execute("""
        DO $$
        DECLARE
            constraint_name text;
        BEGIN
            SELECT tc.constraint_name INTO constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
             AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = 'agent_schedules'
              AND kcu.column_name = 'flow_id'
              AND ccu.table_name = 'agent_recipes'
            LIMIT 1;

            IF constraint_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE agent_schedules DROP CONSTRAINT %I', constraint_name);
            END IF;
        END $$;
    """)
    op.create_foreign_key(
        "agent_schedules_flow_id_fkey",
        "agent_schedules",
        "flows",
        ["flow_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_table("agent_recipes")


def downgrade() -> None:
    op.create_table(
        "agent_recipes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("flow_id", sa.String(36), nullable=False),
        sa.Column("goal", sa.Text(), nullable=False),
        sa.Column("success_criteria", sa.Text(), nullable=False),
        sa.Column("steps", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["flow_id"], ["flows.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("flow_id"),
    )
    op.create_index("ix_agent_recipes_flow_id", "agent_recipes", ["flow_id"])

    op.execute("""
        INSERT INTO agent_recipes (flow_id, goal, success_criteria, steps)
        SELECT
            flow_id,
            agent_recipe::json ->> 'goal',
            agent_recipe::json ->> 'success_criteria',
            (agent_recipe::json -> 'steps')::text
        FROM generated_recipes
        WHERE agent_recipe IS NOT NULL
    """)

    op.drop_constraint("agent_schedules_flow_id_fkey", "agent_schedules", type_="foreignkey")
    op.create_foreign_key(
        "agent_schedules_flow_id_fkey",
        "agent_schedules",
        "agent_recipes",
        ["flow_id"],
        ["flow_id"],
        ondelete="CASCADE",
    )
