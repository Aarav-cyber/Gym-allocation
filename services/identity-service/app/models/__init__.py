# Re-export all models so Alembic's env.py can import Base.metadata
# and discover every table via a single import.

from app.models.base import Base  # noqa: F401
from app.models.user import AuthSession, ExternalIdentity, User  # noqa: F401
from app.models.role import Role, UserRole  # noqa: F401

__all__ = [
    "Base",
    "User",
    "ExternalIdentity",
    "AuthSession",
    "Role",
    "UserRole",
]
