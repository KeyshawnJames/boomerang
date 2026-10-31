import re
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from starlette.concurrency import run_in_threadpool

from app.api.deps import require_role
from app.core.config import settings
from app.core.i18n import api_error, request_locale
from app.core.security import create_upload_token, decode_upload_token
from app.models import User, UserRole
from app.schemas.upload import PresignedUpload, PresignRequest

router = APIRouter()

ClientUser = Annotated[User, Depends(require_role(UserRole.client))]

EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/heic": "heic"}


@router.post("/uploads/presign")
def presign_upload(user: ClientUser, body: PresignRequest, request: Request) -> PresignedUpload:
    # The user id prefix lets POST /returns refuse a photo another client uploaded.
    key = f"{user.id}/{body.kind}/{uuid.uuid4()}.{EXTENSIONS[body.content_type]}"
    token = create_upload_token(key, body.content_type, settings.upload_max_bytes)
    url = request.url_for("upload_file", key=key).include_query_params(token=token)
    return PresignedUpload(key=key, url=str(url))


# Dev stand-in for a Supabase Storage signed upload URL (ADR 0014). The signed token is the
# only credential, as with Supabase, and the app never calls this route by name.
@router.put("/uploads/{key:path}", status_code=204, include_in_schema=False)
# An empty token, like a bad one, gets the bilingual 403 instead of FastAPI's English 422.
async def upload_file(key: str, request: Request, token: str = "") -> Response:
    locale = request_locale(request)
    signed = decode_upload_token(token, key)
    if signed is None:
        raise api_error(403, "upload_link_invalid", locale)
    media_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
    if media_type != signed["content_type"]:
        raise api_error(415, "wrong_photo_type", locale)
    # Read it all before writing, so a refused upload leaves no file behind.
    data = bytearray()
    async for chunk in request.stream():
        data += chunk
        if len(data) > signed["max_bytes"]:
            raise api_error(413, "photo_too_large", locale)
    # The key came from our own signature, so it can't climb out of upload_dir.
    try:
        await run_in_threadpool(save_once, settings.upload_dir / key, bytes(data))
    except FileExistsError:
        raise api_error(403, "upload_link_invalid", locale) from None
    return Response(status_code=204)


def is_uploaded(user: User, kind: str, key: str) -> bool:
    """The key names this user's photo of this kind, and the photo was uploaded."""
    # The full pattern, not just the prefix, so "{id}/label/../.." can't reach other files.
    pattern = rf"{user.id}/{kind}/[0-9a-f-]{{36}}\.({'|'.join(EXTENSIONS.values())})"
    return re.fullmatch(pattern, key) is not None and (settings.upload_dir / key).is_file()


def save_once(path: Path, data: bytes) -> None:
    # "x" refuses an existing file: a link uploads once, like Supabase's default (no upsert).
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as file:
        file.write(data)
