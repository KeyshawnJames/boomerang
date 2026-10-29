from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import Engine, text
from sqlmodel import Session, SQLModel

import app.models  # noqa: F401  (registers tables on SQLModel.metadata)
from app.core.db import include_object


def test_session_talks_to_postgis(session: Session):
    version = session.exec(text("SELECT postgis_version()")).one()[0]

    assert version.startswith("3.6")


def test_migrations_reach_head(engine: Engine, alembic_config: Config):
    head = ScriptDirectory.from_config(alembic_config).get_current_head()

    with engine.connect() as conn:
        assert MigrationContext.configure(conn).get_current_revision() == head


def test_models_match_migrations(engine: Engine):
    # Fails when a model changed without a migration.
    with engine.connect() as conn:
        context = MigrationContext.configure(conn, opts={"include_object": include_object})
        assert compare_metadata(context, SQLModel.metadata) == []
