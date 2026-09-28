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
load_dotenv()

postgres_url = os.getenv(
    "DATABASE_URL",
    "postgresql://dawid:pizza123@localhost:5432/job_aggregator"
) 
connect_args = {"check_same_thread": False, "timeout": 30} if postgres_url.startswith("sqlite:") else {}
engine = create_engine(postgres_url, connect_args=connect_args)
if postgres_url.startswith("sqlite:"):
    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def configure_sqlite(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("PRAGMA journal_mode=WAL")


# Create a db and session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session

        
SessionDep = Annotated[Session, Depends(get_session)]
