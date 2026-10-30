import phonenumbers
from fastapi import APIRouter, Request
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.i18n import api_error, request_locale
from app.core.security import DUMMY_HASH, create_access_token, hash_password, verify_password
from app.models import DriverProfile, Locale, User, UserRole
from app.schemas.user import LoginRequest, RegisterRequest, Token, UpdateMeRequest, UserRead

router = APIRouter()


def e164(phone: str, locale: Locale) -> str:
    # Numbers without a country code are read as Canadian.
    try:
        number = phonenumbers.parse(phone, "CA")
    except phonenumbers.NumberParseException:
        number = None
    if number is None or not phonenumbers.is_valid_number(number):
        raise api_error(422, "invalid_phone", locale)
    return phonenumbers.format_number(number, phonenumbers.PhoneNumberFormat.E164)


@router.post("/auth/register", status_code=201, response_model=UserRead)
def register(body: RegisterRequest, session: SessionDep) -> User:
    user = User(
        role=body.role,
        name=body.name,
        # The unique constraint on users.email is case-sensitive, so store one form.
        email=body.email.lower(),
        phone=None if body.phone is None else e164(body.phone, body.locale),
        password_hash=hash_password(body.password),
        locale=body.locale,
    )
    session.add(user)
    try:
        # The unique constraint, not a lookup first, so two sign-ups at once can't both win.
        session.flush()
    except IntegrityError:
        raise api_error(409, "email_taken", body.locale) from None
    if user.role == UserRole.driver:
        session.add(DriverProfile(user_id=user.id))
    session.commit()
    session.refresh(user)
    return user


@router.post("/auth/login")
def login(body: LoginRequest, session: SessionDep, request: Request) -> Token:
    user = session.exec(select(User).where(User.email == body.email.lower())).first()
    password_ok = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not password_ok:
        # The device language, not the account's, so the reply doesn't reveal the account exists.
        raise api_error(401, "bad_credentials", request_locale(request))
    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> User:
    return user


@router.patch("/me", response_model=UserRead)
def update_me(body: UpdateMeRequest, user: CurrentUser, session: SessionDep) -> User:
    user.phone = e164(body.phone, user.locale)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
