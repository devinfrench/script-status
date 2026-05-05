"""add session status

Revision ID: 202605050001
Revises: 202605040001
Create Date: 2026-05-05 00:01:00
"""
from alembic import op
import sqlalchemy as sa

revision = "202605050001"
down_revision = "202605040001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column("status", sa.String(length=64), server_default="UNKNOWN", nullable=False),
    )
    op.create_check_constraint(
        "ck_sessions_status_nonempty",
        "sessions",
        "length(status) > 0",
    )
    op.alter_column("sessions", "status", server_default=None)


def downgrade() -> None:
    op.drop_constraint("ck_sessions_status_nonempty", "sessions", type_="check")
    op.drop_column("sessions", "status")
