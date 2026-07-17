from sqlmodel import Field, SQLModel


class ContactApplicationLink(SQLModel, table=True):
    contact_id: int | None = Field(
        default=None, foreign_key="contact.id", primary_key=True
    )
    application_id: int | None = Field(
        default=None, foreign_key="application.id", primary_key=True
    )