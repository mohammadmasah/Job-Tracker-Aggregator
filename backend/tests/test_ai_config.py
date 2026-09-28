import unittest
from unittest.mock import patch

from app.core.ai_config import DEFAULT_MODEL, LANGUAGE_POLICY
from app.services.llm_service import get_llm_model
from app.services import ai_agents
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableLambda


class AIConfigTests(unittest.TestCase):
    def test_lightweight_model_and_memory_lifetime(self):
        with patch.dict('os.environ', {}, clear=True), patch('app.services.llm_service.ChatOllama') as model:
            get_llm_model()
            args = model.call_args.kwargs
            self.assertEqual(args['model'], 'qwen3:1.7b')
            self.assertEqual(args['model'], DEFAULT_MODEL)
            self.assertEqual(args['keep_alive'], '2m')
            self.assertLessEqual(args['num_thread'], 4)
            self.assertEqual(args['num_predict'], 512)
            self.assertFalse(args['reasoning'])

    def test_language_policy_overrides_old_persian_history_for_both_chat_and_pdf(self):
        history = InMemoryChatMessageHistory(messages=[HumanMessage(content='سلام'), AIMessage(content='سلام دوست من')])
        seen = []
        def model(prompt):
            seen.append(prompt.to_messages())
            return AIMessage(content='Bonjour !')
        with patch.object(ai_agents, 'get_llm_model', return_value=RunnableLambda(model)), \
             patch.object(ai_agents, 'get_user_applications_context', return_value=''), \
             patch.object(ai_agents, 'get_sessions_history', return_value=history):
            ai_agents.generate_chatbot_response('لطفاً فارسی جواب بده', '1:test')
            ai_agents.generate_chatbot_response('Analyze CV\nContent PDF: Python developer', '1:test', 'cv.pdf')
        for messages in seen:
            self.assertIsInstance(messages[0], SystemMessage)
            self.assertIn(LANGUAGE_POLICY, messages[0].content)
            self.assertIn('only in French or English', messages[0].content)
