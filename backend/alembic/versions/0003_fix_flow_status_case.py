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
    # Rename the enum values (PostgreSQL 10+ supports RENAME VALUE)
    op.execute("ALTER TYPE flow_status RENAME VALUE 'TESTS_NOT_GENERATED' TO 'tests_not_generated'")
    op.execute("ALTER TYPE flow_status RENAME VALUE 'TESTS_GENERATED' TO 'tests_generated'")


def downgrade() -> None:
    op.execute("ALTER TYPE flow_status RENAME VALUE 'tests_not_generated' TO 'TESTS_NOT_GENERATED'")
    op.execute("ALTER TYPE flow_status RENAME VALUE 'tests_generated' TO 'TESTS_GENERATED'")
