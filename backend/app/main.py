from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_and_tables
from .routes import adzuna, applications, contacts, contact_method, documents, scraper, chatbot, chatbot_analyse, user, offers, weLoveDevs
from app.api.user import router as user_router

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)
limiter = Limiter(key_func=get_remote_address)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       
    allow_credentials=True,
    allow_methods=["*"],            
    allow_headers=["*"],            
)

app.include_router(applications.router)
app.include_router(contacts.router)
app.include_router(contact_method.router)
app.include_router(documents.router)
app.include_router(scraper.router)
app.include_router(chatbot.router)
app.include_router(chatbot_analyse.router)
app.include_router(user.router)
app.include_router(offers.router)
app.include_router(weLoveDevs.router)
app.include_router(adzuna.router)
app.include_router(user_router)