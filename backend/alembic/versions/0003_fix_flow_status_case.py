"""fix flow_status enum values to lowercase

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-24
"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = 'flow_status' AND e.enumlabel = 'TESTS_NOT_GENERATED'
            ) THEN
                ALTER TYPE flow_status RENAME VALUE 'TESTS_NOT_GENERATED' TO 'tests_not_generated';
            END IF;
            IF EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = 'flow_status' AND e.enumlabel = 'TESTS_GENERATED'
            ) THEN
                ALTER TYPE flow_status RENAME VALUE 'TESTS_GENERATED' TO 'tests_generated';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = 'flow_status' AND e.enumlabel = 'tests_not_generated'
            ) THEN
                ALTER TYPE flow_status RENAME VALUE 'tests_not_generated' TO 'TESTS_NOT_GENERATED';
            END IF;
            IF EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = 'flow_status' AND e.enumlabel = 'tests_generated'
            ) THEN
                ALTER TYPE flow_status RENAME VALUE 'tests_generated' TO 'TESTS_GENERATED';
            END IF;
        END $$;
    """)
