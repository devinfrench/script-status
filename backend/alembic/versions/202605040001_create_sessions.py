"""create sessions table

Revision ID: 202605040001
Revises:
Create Date: 2026-05-04 00:01:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202605040001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("script_name", sa.String(length=255), nullable=False),
        sa.Column("stopped_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("run_time_seconds", sa.Integer(), nullable=False),
        sa.Column("experience_gained", sa.Integer(), nullable=False),
        sa.Column("runtime_info", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.CheckConstraint("experience_gained >= 0", name="ck_sessions_experience_gained_nonnegative"),
        sa.CheckConstraint("run_time_seconds >= 0", name="ck_sessions_run_time_seconds_nonnegative"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sessions_id"), "sessions", ["id"], unique=False)
    op.create_index(op.f("ix_sessions_script_name"), "sessions", ["script_name"], unique=False)
    op.create_index(op.f("ix_sessions_stopped_at"), "sessions", ["stopped_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sessions_stopped_at"), table_name="sessions")
    op.drop_index(op.f("ix_sessions_script_name"), table_name="sessions")
    op.drop_index(op.f("ix_sessions_id"), table_name="sessions")
    op.drop_table("sessions")
