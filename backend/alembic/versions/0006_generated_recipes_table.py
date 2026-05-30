"""rename generated_tests to generated_recipes

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-29
"""
import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            IF to_regclass('public.generated_tests') IS NOT NULL
               AND to_regclass('public.generated_recipes') IS NULL THEN
                ALTER TABLE generated_tests RENAME TO generated_recipes;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF to_regclass('public.generated_recipes') IS NOT NULL
               AND EXISTS (
                   SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'generated_recipes' AND column_name = 'bdd_text'
               )
               AND NOT EXISTS (
                   SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'generated_recipes' AND column_name = 'agent_recipe'
               ) THEN
                ALTER TABLE generated_recipes RENAME COLUMN bdd_text TO agent_recipe;
            END IF;
        END $$;
    """)
    op.execute("ALTER TABLE IF EXISTS generated_recipes DROP COLUMN IF EXISTS playwright_text")
    op.execute("ALTER TABLE IF EXISTS generated_recipes DROP COLUMN IF EXISTS model_name")
    op.execute(
        "ALTER INDEX IF EXISTS ix_generated_tests_flow_id "
        "RENAME TO ix_generated_recipes_flow_id"
    )


def downgrade() -> None:
    op.add_column(
        "generated_recipes",
        sa.Column("playwright_text", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "generated_recipes",
        sa.Column("model_name", sa.String(120), nullable=True),
    )
    op.alter_column("generated_recipes", "agent_recipe", new_column_name="bdd_text")
    op.rename_table("generated_recipes", "generated_tests")
    op.execute(
        "ALTER INDEX IF EXISTS ix_generated_recipes_flow_id "
        "RENAME TO ix_generated_tests_flow_id"
    )
    op.alter_column("generated_tests", "playwright_text", server_default=None)
