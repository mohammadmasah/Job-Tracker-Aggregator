from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .application import Application


class Document(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    application_id: int = Field(foreign_key="application.id")
    filename: str
    path: str
    type: str | None = None
    uploaded_at: datetime = Field(default_factory=datetime.now)
    application: Optional["Application"] = Relationship(back_populates="documents")


class DocumentUpdate(SQLModel):
    filename: str | None = None
    type: str | None = None


class DocumentRead(SQLModel):
    id: int
    filename: str
    path: str
    type: str | None = None
    uploaded_at: datetime