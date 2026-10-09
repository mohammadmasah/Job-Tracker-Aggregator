"""Per-account AI selection; provider credentials are encrypted before persistence."""
from sqlmodel import SQLModel, Field


class AISelection(SQLModel, table=True):
    user_id: int = Field(primary_key=True, foreign_key='user.id')
    provider: str = 'local'


class AIProvider(SQLModel, table=True):
    user_id: int = Field(primary_key=True, foreign_key='user.id')
    provider: str = Field(primary_key=True)
    model: str
    encrypted_key: str
