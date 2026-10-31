from sqlmodel import SQLModel


class AddressSuggestion(SQLModel):
    place_id: str
    text: str


class ResolvedAddress(SQLModel):
    address: str
    # Hand this to POST /returns; it proves the server looked the address up (ADR 0013).
    token: str
