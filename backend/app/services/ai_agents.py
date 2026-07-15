from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from app.services.llm_service import get_llm_model
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import InMemoryChatMessageHistory


sessions_db = {}

def get_sessions_history(session_id: str) -> InMemoryChatMessageHistory:
    if session_id not in sessions_db:
        sessions_db[session_id] = InMemoryChatMessageHistory()

    return sessions_db[session_id]

def generate_chatbot_response(user_message: str, session_id: str = "default_session") -> str:
    """
    """
    llm = get_llm_model()

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a kind and intelligent teaching assistant. You help students learn web development courses and write answers in a simple and fluent manner."),

        MessagesPlaceholder(variable_name = "chat_history"),
        ("user", "{student_input}")
    ])

    chain = prompt | llm

    chain_with_history = RunnableWithMessageHistory(
        chain,
        get_sessions_history,
        input_messages_key="student_input",
        history_messages_key="chat_history"
    )

    response = chain_with_history.invoke(
        {"student_input" : user_message},
        config={"configurable": {"session_id": session_id}}
    )
    return response.content