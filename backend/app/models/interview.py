"""Private interview sessions, independent of the everyday chatbot history."""
from datetime import datetime
from sqlalchemy import JSON
from sqlmodel import Column, Field, SQLModel


class InterviewSession(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    source_kind: str
    source_id: int
    company: str
    position: str
    context: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    profile: str = ''
    language: str = 'fr'
    focus: str = 'mixed'
    question_count: int = 5
    status: str = 'ready'
    turns: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    preparation: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    report: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    revision: int = 0
    last_request_id: str = ''
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
