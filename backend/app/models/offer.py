from sqlmodel import Field, SQLModel

class Offer(SQLModel, table=True):
    id: int | None=Field(default=None, primary_key=True)
    company: str

class CreateOffer(SQLModel):
    company: str

class ReadOffer(SQLModel):
    company: str
    
    