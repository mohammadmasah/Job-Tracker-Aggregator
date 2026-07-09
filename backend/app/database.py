from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, SQLModel, create_engine


# Create db file when app runs first time

sqlite_file_name = "database.db" #File name
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)


# Create a db and session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session

        
SessionDep = Annotated[Session, Depends(get_session)]
