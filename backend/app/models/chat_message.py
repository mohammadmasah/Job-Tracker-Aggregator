from datetime import datetime, timezone

from sqlalchemy import Column, JSON, Index
from sqlmodel import Field, SQLModel


class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_message"
    __table_args__ = (Index("ix_chat_message_owner_session_id", "user_id", "session_id", "id"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    session_id: str = Field(max_length=80)
    payload: dict = Field(sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
