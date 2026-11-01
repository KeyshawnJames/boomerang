from sqlmodel import Field, SQLModel


class PayRequest(SQLModel):
    # Cents. Anything above $50 is likely a typo (ADR 0018). The app never sends an amount.
    tip: int = Field(default=0, ge=0, le=5000)


class PaymentIntentRead(SQLModel):
    # For Stripe's card screen in the app.
    client_secret: str
    total: int  # cents: the fee plus the tip
