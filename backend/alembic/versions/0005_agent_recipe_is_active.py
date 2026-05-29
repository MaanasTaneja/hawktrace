"""add is_active to agent_recipes

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-25
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("agent_recipes", sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"))


def downgrade() -> None:
    op.drop_column("agent_recipes", "is_active")
