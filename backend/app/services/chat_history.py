from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import message_to_dict, messages_from_dict
from sqlmodel import Session, select

from app.database import engine
from app.models.chat_message import ChatMessage


class DatabaseChatHistory(BaseChatMessageHistory):
    def __init__(self, user_id: int, session_id: str):
        self.user_id = user_id
        self.session_id = session_id

    def rows(self):
        with Session(engine) as session:
            return session.exec(select(ChatMessage).where(
                ChatMessage.user_id == self.user_id,
                ChatMessage.session_id == self.session_id,
            ).order_by(ChatMessage.id)).all()

    @property
    def messages(self):
        return messages_from_dict([row.payload for row in self.rows()])

    def add_messages(self, messages):
        # Save both sides of a completed turn in one transaction.
        with Session(engine) as session:
            for message in messages:
                session.add(ChatMessage(
                    user_id=self.user_id, session_id=self.session_id,
                    payload=message_to_dict(message),
                ))
            session.commit()

    def clear(self):
        with Session(engine) as session:
            for row in session.exec(select(ChatMessage).where(
                ChatMessage.user_id == self.user_id,
                ChatMessage.session_id == self.session_id,
            )).all():
                session.delete(row)
            session.commit()


def get_sessions_history(key: str):
    user_id, session_id = key.split(":", 1)
    return DatabaseChatHistory(int(user_id), session_id)
