import unittest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from app.routes.user import router


class LogoutTests(unittest.TestCase):
    def test_logout_clears_cookie_including_expired_or_invalid_sessions(self):
        app = FastAPI()
        app.include_router(router)

        @app.get('/session-cookie')
        def session_cookie(request: Request):
            return {'present': 'access_token' in request.cookies}

        with TestClient(app) as client:
            client.cookies.set('access_token', 'expired-or-invalid', domain='testserver.local', path='/')
            self.assertTrue(client.get('/session-cookie').json()['present'])
            response = client.post('/api/user/logout')
            self.assertEqual(response.status_code, 200)
            cookie = response.headers['set-cookie']
            self.assertIn('Max-Age=0', cookie)
            self.assertIn('Path=/', cookie)
            self.assertIn('HttpOnly', cookie)
            self.assertFalse(client.get('/session-cookie').json()['present'])
            self.assertEqual(client.post('/api/user/logout').status_code, 200)
