from sqlmodel import Field, SQLModel

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field
    lastname: str = Field
    email: str = Field (index=True, unique=True)
    hashed_password: str 
    