from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, SQLModel, Relationship
from .contact_method import ContactMethodRead

if TYPE_CHECKING:
    from .contact_method import ContactMethod
    from .application import Application


class Contact(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    application_id: int | None = Field(default=None, foreign_key="application.id")
    name: str
    application: Optional["Application"] = Relationship(back_populates="contacts")
    methods: list["ContactMethod"] = Relationship(back_populates="contact")


class ContactUpdate(SQLModel):
    name: str | None = None
    application_id: int | None = None


class ContactRead(SQLModel):
    id: int
    name: str
    application_id: int | None = None
    methods: list[ContactMethodRead] = []