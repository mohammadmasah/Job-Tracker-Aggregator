from sqlmodel import Field, SQLModel, Column, UniqueConstraint
from sqlalchemy import JSON


class Offer(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("source", "reference"),)
    id: int | None = Field(default=None, primary_key=True)
    source: str = Field(index=True)
    reference: str | None = Field(default=None, index=True)
    title: str
    company: str | None = None
    description: str | None = None
    descriptionPreview: str | None = None
    localisation: list[str] | None = Field(default=[], sa_column=Column(JSON))
    createdAt: str | None = None
    start: str | None = None
    sectors: list[str] | None = Field(default=[], sa_column=Column(JSON))

    skills: list[str] | None = Field(default=[], sa_column=Column(JSON))

    salary_currency: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None


class CreateOffer(SQLModel):
    source: str
    title: str
    company: str
    description: str | None = None
    descriptionPreview: str | None = None
    localisation: list[str] | None = Field(default=[], sa_column=Column(JSON))
    createdAt: str | None = None
    start: str | None = None

    salary_currency: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None


class ReadOffer(SQLModel):
    source: str
    title: str
    company: str
    description: str | None = None
    descriptionPreview: str | None = None
    localisation: str | None = None
    createdAt: str | None = None
    start: str | None = None

    salary_currency: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
