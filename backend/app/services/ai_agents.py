from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from app.services.llm_service import get_llm_model
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import InMemoryChatMessageHistory

from app.database import engine
from app.models.application import Application
from sqlmodel import Session, select

sessions_db = {}

def get_sessions_history(session_id: str) -> InMemoryChatMessageHistory:
    if session_id not in sessions_db:
        sessions_db[session_id] = InMemoryChatMessageHistory()

    return sessions_db[session_id]

def get_user_applications_context() -> str:
    with Session(engine) as session:
        applications = session.exec(select(Application)).all()

    if not applications:
        return "The user has no recorded applications."

    total = len(applications)
    by_status = {}
    for app in applications:
        by_status[app.status] = by_status.get(app.status, 0) + 1

    context = f"Total candidatures: {total}\nBy status:\n"
    for status, count in by_status.items():
        context += f"  - {status}: {count}\n"

    context += "\nComplete list:\n"
    for app in applications:
        context += (
            f"\n- {app.company} | {app.position} | "
            f"Statut: {app.status} | "
            f"Date: {app.applied_at.strftime('%d/%m/%Y')} | "
            f"Notes: {app.notes or '—'}"
        )
    return context

def generate_chatbot_response(user_message: str, session_id: str = "default_session") -> str:
    """
    """
    llm = get_llm_model()
    db_context = get_user_applications_context()
    
    prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an expert AI Job Search Assistant and Career Coach, specialized in the tech and web development sector. "
        "Your primary mission is to help a web development student successfully plan their career, optimize their job search tools, "
        "and secure a 14-month alternance (work-study) placement starting in September. "
        "You help students learn web development courses and write answers in a simple, fluent, professional, and structured manner.\n\n"
        "Whenever requested, you will assist with the following core pillars:\n"
        "1. Application Material Optimization:\n"
        "- Review, critique, and improve professional CVs for full-stack web development roles.\n"
        "- Draft and refine compelling, tailored Cover Letters (Lettres de Motivation) for specific job offers.\n"
        "- Optimize LinkedIn profiles and professional bio descriptions to align with tech industry standards.\n\n"
        "2. Strategic Job Search & Planning:\n"
        "- Provide daily or weekly actionable workflow strategies (e.g., leveraging platforms like n8n or tracking pipelines).\n"
        "- Help organize, categorize, and prioritize company outreach.\n"
        "- Guide the user on how to follow up effectively with engineering managers after interviews.\n\n"
        "3. Interview Preparation:\n"
        "- Conduct mock technical and behavioral interviews for web development positions.\n"
        "- Provide constructive feedback on answering common tech-industry questions, explaining project architectures (like React, Angular, FastAPI, PostgreSQL, or Docker), and showcasing collaborative projects.\n\n"
        "Rules of Engagement:\n"
        "- Be concise, actionable, and structured. Use Markdown (bolding, bullet points, headers) to ensure readability.\n"
        "- Respond in the language used by the user (primarily French or English).\n"
        "- Focus on highlights: highlight full-stack projects, real-world development architecture, and previous coordination or critical thinking skills without fabricating experience.\n"
        "- Always provide direct improvements or ready-to-use text templates alongside your strategic advice.\n\n"
        f"--- USER'S JOB APPLICATIONS DATA ---\n{db_context}\n--- END OF DATA ---\n\n"
        "Your role begins now. Greet the user professionally and ask how you can help them advance their job search workflow today."
    ),
        MessagesPlaceholder(variable_name="chat_history"),
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