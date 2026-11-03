"""Driver accounts. Until there's an admin screen, a founder approves drivers here (ADR 0019).

Run with `uv run python -m app.drivers approve <email>`.
"""

import argparse

from sqlmodel import Session, select

from app.core.db import engine
from app.models import DriverProfile, User, UserRole


def approve(session: Session, email: str) -> None:
    user = session.exec(
        select(User).where(User.email == email.lower(), User.role == UserRole.driver)
    ).first()
    if user is None:
        raise SystemExit(f"No driver account with the email {email}.")
    profile = session.get(DriverProfile, user.id)
    profile.is_approved = True
    session.add(profile)
    print(f"Approved {user.name} ({user.email}).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog="python -m app.drivers")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("approve", help="let a registered driver see jobs").add_argument("email")
    args = parser.parse_args()
    with Session(engine) as session:
        approve(session, args.email)
        session.commit()
