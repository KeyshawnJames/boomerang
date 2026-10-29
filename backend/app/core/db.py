from collections.abc import Iterator

from sqlmodel import Session, create_engine

from app.core.config import settings

# pre_ping drops connections the Supabase pooler closed while idle.
engine = create_engine(settings.database_url, pool_pre_ping=True)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


def include_object(obj, name, type_, reflected, compare_to) -> bool:
    """Alembic autogenerate filter: never propose dropping a table that has no model.

    PostGIS ships its own tables (spatial_ref_sys, tiger, topology). So removing one of our
    models means writing its drop_table by hand.
    """
    return not (type_ == "table" and reflected and compare_to is None)
