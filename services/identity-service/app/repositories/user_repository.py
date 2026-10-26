"""
Repository layer for User and ExternalIdentity.

All database access is isolated here — no raw SQL in service or API layers.
"""

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import AuthSession, ExternalIdentity, User
from app.models.role import UserRole, Role


class UserRepository:

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        result = await self._session.execute(
            select(User)
            .options(
                selectinload(User.user_roles).selectinload(UserRole.role),
                selectinload(User.external_identities),
            )
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Case-insensitive lookup (normalise email before calling)."""
        result = await self._session.execute(
            select(User)
            .options(
                selectinload(User.user_roles).selectinload(UserRole.role),
            )
            .where(User.email == email.lower().strip())
        )
        return result.scalar_one_or_none()

    async def get_by_provider(
        self, provider: str, provider_subject: str
    ) -> Optional[User]:
        result = await self._session.execute(
            select(User)
            .join(ExternalIdentity, ExternalIdentity.user_id == User.id)
            .options(
                selectinload(User.user_roles).selectinload(UserRole.role),
            )
            .where(
                ExternalIdentity.provider == provider,
                ExternalIdentity.provider_subject == provider_subject,
            )
        )
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def save(self, user: User) -> User:
        self._session.add(user)
        await self._session.flush()
        return user

    async def list_all(self, skip: int = 0, limit: int = 100) -> list[User]:
        result = await self._session.execute(
            select(User)
            .options(selectinload(User.user_roles).selectinload(UserRole.role))
            .offset(skip)
            .limit(limit)
            .order_by(User.created_at.desc())
        )
        return list(result.scalars().all())


class RoleRepository:

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_name(self, name: str) -> Optional[Role]:
        result = await self._session.execute(
            select(Role).where(Role.name == name.upper())
        )
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Role]:
        result = await self._session.execute(select(Role).order_by(Role.name))
        return list(result.scalars().all())

    async def assign_role(self, user_role: UserRole) -> UserRole:
        self._session.add(user_role)
        await self._session.flush()
        return user_role
