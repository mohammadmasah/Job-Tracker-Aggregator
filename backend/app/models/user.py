from sqlmodel import Field, SQLModel
from pydantic import Field as PydanticField


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str 
    lastname: str 
    email: str = Field (index=True, unique=True)
    hashed_password: str 
    role: str = Field(default="user")
    
class UserCreate(SQLModel):
    name: str
    lastname: str
    email: str
    password: str

class UserLogin(SQLModel):
    email: str
    password: str