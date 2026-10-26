import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, uuid_pk


class User(Base, TimestampMixin):
    """
    Core authentication identity.
    Owns provisioned accounts.  Google password is never stored.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = uuid_pk()
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # PENDING | ACTIVE | SUSPENDED | INACTIVE
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")

    # Relationships
    external_identities: Mapped[list["ExternalIdentity"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    user_roles: Mapped[list["UserRole"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    auth_sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (
        # Normalised unique email (case-insensitive enforced in app layer)
        Index("ix_users_email_lower", "email", unique=True),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} status={self.status}>"


class ExternalIdentity(Base, TimestampMixin):
    """
    Links a local User to a provider identity (e.g. Google).
    Stores the provider's stable subject identifier — never a password.
    """

    __tablename__ = "external_identities"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "google"
    provider_subject: Mapped[str] = mapped_column(String(256), nullable=False)

    user: Mapped["User"] = relationship(back_populates="external_identities")

    __table_args__ = (
        UniqueConstraint("provider", "provider_subject", name="uq_external_provider_sub"),
        Index("ix_external_identities_user_id", "user_id"),
    )


class AuthSession(Base):
    """
    Server-side session record.  Token is hashed before storage.
    """

    __tablename__ = "auth_sessions"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    session_token_hash: Mapped[str] = mapped_column(String(256), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="auth_sessions")

    __table_args__ = (
        Index("ix_auth_sessions_user_id", "user_id"),
    )
