# ============================================================
# 1. TABLE D'ASSOCIATION — models/contact_application_link.py
# ============================================================
from sqlmodel import Field, SQLModel
# ============================================================
# 2. MODÈLE CONTACT — models/contact.py
# ============================================================
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, SQLModel, Relationship
from .contact_method import ContactMethodRead
from .contact_application_link import ContactApplicationLink

if TYPE_CHECKING:
    from .contact_method import ContactMethod
    from .application import Application


class Contact(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    notes: str | None = Field(default=None)
    methods: list["ContactMethod"] = Relationship(back_populates="contact")
    # Many-to-many : un contact ↔ plusieurs candidatures
    applications: list["Application"] = Relationship(
        back_populates="contacts", link_model=ContactApplicationLink
    )


class ContactCreate(SQLModel):
    name: str
    notes: str | None = None
    application_ids: list[int] = []   # liste de candidatures à lier à la création


class ContactUpdate(SQLModel):
    name: str | None = None
    notes: str | None = None


class ContactRead(SQLModel):
    id: int
    name: str
    notes: str | None = None
    methods: list[ContactMethodRead] = []
    application_ids: list[int] = []   # ids des candidatures liées


# ============================================================
# 3. CÔTÉ APPLICATION — models/application.py
#    Ajouter la relation inverse dans la classe Application :
# ============================================================
# from .contact_application_link import ContactApplicationLink
#
# class Application(SQLModel, table=True):
#     ...
#     contacts: list["Contact"] = Relationship(
#         back_populates="applications", link_model=ContactApplicationLink
#     )
#     # (retire l'ancien: contacts via contact.application_id)