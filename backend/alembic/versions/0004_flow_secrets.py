"""add flow_secrets table

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-25
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "flow_secrets",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("flow_id", sa.String(36), sa.ForeignKey("flows.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("key", sa.String(120), nullable=False),
        sa.Column("value", sa.Text(), nullable=False, server_default=""),
    )
    op.create_unique_constraint("uq_flow_secrets_flow_key", "flow_secrets", ["flow_id", "key"])


def downgrade() -> None:
    op.drop_table("flow_secrets")
