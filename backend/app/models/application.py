from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
from typing import TYPE_CHECKING
from .contact import ContactRead
from .document import DocumentRead
from .contact_application_link import ContactApplicationLink

if TYPE_CHECKING:
    from .contact import Contact
    from .document import Document


class Application(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    url: str | None = Field(default=None)
    company: str = Field(index=True)
    location: str | None = Field(default=None, index=True)
    position: str = Field(index=True)
    sector: str | None = Field(default=None, index=True)
    salary: str | None = Field(default=None, index=True)
    remote: bool = Field(default=False, index=True)
    type: str = Field(default="alternance", index=True)
    status: str = Field(default="to_apply", index=True)
    notes: str | None = None
    applied_at: datetime = Field(default_factory=datetime.now)
    contacts: list["Contact"] = Relationship(
        back_populates="applications",
        link_model=ContactApplicationLink,
    )
    documents: list["Document"] = Relationship(back_populates="application")


class ApplicationCreate(SQLModel):
    url: str | None = None
    company: str
    location: str | None = None
    position: str
    sector: str | None = None
    salary: str | None = None
    remote: bool = False
    type: str = "alternance"
    status: str = "to_apply"
    notes: str | None = None
    applied_at: datetime | None = None


class ApplicationUpdate(SQLModel):
    company: str | None = None
    sector: str | None = None
    position: str | None = None
    url: str | None = None
    type: str | None = None
    status: str | None = None
    location: str | None = None
    remote: bool | None = None
    salary: str | None = None
    notes: str | None = None


class ApplicationRead(SQLModel):
    id: int
    url: str | None = None
    company: str
    location: str | None = None
    position: str
    sector: str | None = None
    salary: str | None = None
    remote: bool
    type: str
    status: str
    notes: str | None = None
    applied_at: datetime
    contacts: list[ContactRead] = []
    documents: list[DocumentRead] = []
