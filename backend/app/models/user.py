from sqlmodel import Field, SQLModel

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str 
    lastname: str 
    email: str = Field (index=True, unique=True)
    hashed_password: str 
    role: str
    
class UserCreate(SQLModel):
    name: str
    lastname: str
    email: str
    password: str
    role: str

class UserLogin(SQLModel):
    email: str
    password: str