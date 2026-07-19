import os
from typing import Annotated
from fastapi import Depends
from dotenv import load_dotenv
from sqlmodel import Session, SQLModel, create_engine


# Create db file when app runs first time


#those line is form last model of database(SQLite)👇

#sqlite_file_name = "database.db" #File name
#sqlite_url = f"sqlite:///{sqlite_file_name}"

#connect_args = {"check_same_thread": False}
#engine = create_engine(sqlite_url, connect_args=connect_args)

postgres_url = os.getenv(
    "DATABASE_URL",
    "postgresql://mohammadharoonmasah@localhost:5432/job_aggregator"
) 
engine = create_engine(postgres_url)


# Create a db and session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session

        
SessionDep = Annotated[Session, Depends(get_session)]
