from contextlib import asynccontextmanager
from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_and_tables
# from .routes import applications, contacts, contact_method, documents, scraper, chatbot
from .routes import user, weLoveDevs, scraper

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(lifespan=lifespan)


# origins = [
#     "http://localhost:3000",
#     "http://127.0.0.1:3000",
# ]


# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,       
#     allow_credentials=True,
#     allow_methods=["*"],            
#     allow_headers=["*"],            
# )

app.include_router(user.router)
app.include_router(weLoveDevs.router)
# app.include_router(applications.router)
# app.include_router(contacts.router)
# app.include_router(contact_method.router)
# app.include_router(documents.router)
app.include_router(scraper.router)
# app.include_router(chatbot.router)