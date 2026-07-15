from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .contact import Contact


class ContactMethod(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    contact_id: int = Field(foreign_key="contact.id")
    type: str
    value: str
    contact: Optional["Contact"] = Relationship(back_populates="methods")


class ContactMethodCreate(SQLModel):
    type: str
    value: str


class ContactMethodUpdate(SQLModel):
    type: str | None = None
    value: str | None = None


class ContactMethodRead(SQLModel):
    id: int
    type: str
    value: str