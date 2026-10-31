from typing import Literal

from sqlmodel import SQLModel


class PresignRequest(SQLModel):
    kind: Literal["label", "package"]
    content_type: Literal["image/jpeg", "image/png", "image/heic"]


class PresignedUpload(SQLModel):
    # Hand this to POST /returns once the upload has worked.
    key: str
    # PUT the photo here, with the same Content-Type, within 15 minutes.
    url: str
