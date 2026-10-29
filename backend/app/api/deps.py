from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.core.db import get_session
from app.core.i18n import api_error, request_locale
from app.core.security import decode_access_token
from app.models import User, UserRole

SessionDep = Annotated[Session, Depends(get_session)]

# auto_error=False so a missing header gets our bilingual 401, not FastAPI's English one.
bearer = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> User:
    user_id = decode_access_token(credentials.credentials) if credentials else None
    user = session.get(User, user_id) if user_id else None
    if user is None:
        raise api_error(401, "not_authenticated", request_locale(request))
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole) -> Callable[[User], User]:
    def check_role(user: CurrentUser) -> User:
        if user.role not in roles:
            raise api_error(403, "forbidden", user.locale)
        return user

    return check_role
