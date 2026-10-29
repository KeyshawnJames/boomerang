import json
from pathlib import Path

from app.main import app

COMMITTED_SPEC = Path(__file__).resolve().parents[2] / "packages/api/openapi.json"


def test_operation_ids_are_unique_route_names():
    # The generated app client names its functions after these (healthOptions, login…).
    paths = app.openapi()["paths"].values()
    ids = [operation["operationId"] for path in paths for operation in path.values()]

    assert len(ids) == len(set(ids))
    assert {"health", "register", "login", "me"} <= set(ids)


def test_app_client_is_up_to_date():
    # Fails when a route or schema changed without `pnpm --filter api generate`.
    live = json.loads(json.dumps(app.openapi()))

    assert json.loads(COMMITTED_SPEC.read_text()) == live
