"""Exercise the built executable with an isolated data directory; no real data."""
import json
from contextlib import closing
import os
from pathlib import Path
import socket
import subprocess
import sqlite3
import sys
import tempfile
import time
import urllib.request
import http.cookiejar
from io import BytesIO
from zipfile import ZipFile


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def run(executable):
    with tempfile.TemporaryDirectory() as directory:
        port, api_port = free_port(), free_port()
        base = f'http://127.0.0.1:{port}'
        env = dict(os.environ, TRACKIT_DATA_DIR=directory)
        client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        def request(path, body=None, method=None):
            data = json.dumps(body).encode() if body is not None else None
            with client.open(urllib.request.Request(base + path, data=data, method=method, headers={'Content-Type': 'application/json'}), timeout=15) as response:
                return response.read()
        def start():
            process = subprocess.Popen([executable, '--no-browser', '--port', str(port), '--api-port', str(api_port)], env=env)
            for _ in range(120):
                if process.poll() is not None:
                    raise RuntimeError('Standalone process exited: ' + str(list(Path(directory).glob('*'))))
                try:
                    request('/api/local/health')
                    return process
                except OSError:
                    time.sleep(0.5)
            process.terminate()
            raise RuntimeError('Standalone startup timed out')
        process = start()
        try:
            assert b'<html' in request('/applications')
            request('/api/user/register', {'name': 'Test', 'lastname': 'Local', 'email': 'local@example.invalid', 'password': 'Smoke-Test-123!'})
            request('/api/user/login', {'email': 'local@example.invalid', 'password': 'Smoke-Test-123!'})
            for path in ['/api/applications', '/api/contacts', '/api/documents', '/api/interviews']:
                assert json.loads(request(path)) == [], f'Fresh installation contains data: {path}'
            assert json.loads(request('/chatbot/history/'))['messages'] == []
            request('/api/applications', {'company': 'Test local', 'position': 'Développeur'})
            applications = json.loads(request('/api/applications'))
            assert len(applications) == 1
            application_id = applications[0]['id']
            practice = json.loads(request('/api/interviews', {'source_kind': 'application', 'source_id': application_id}))
            interview_id = practice['id']
            assert practice['context']['company'] == 'Test local'
            assert b'<html' in request(f'/interviews/{interview_id}')
            boundary = 'TrackItSmokeBoundary'
            file_content = b'TrackIt portable attachment smoke test'
            multipart = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="cv.txt"\r\n'
                         'Content-Type: text/plain\r\n\r\n').encode() + file_content + f'\r\n--{boundary}--\r\n'.encode()
            with client.open(urllib.request.Request(base + f'/api/documents/{application_id}', data=multipart,
                             headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}), timeout=15) as response:
                document = json.loads(response.read())
            document_id = document['id']
            assert request(f'/api/documents/{document_id}/download') == file_content
            with ZipFile(BytesIO(request('/api/applications/export.xlsx'))) as workbook:
                assert 'xl/worksheets/sheet2.xml' in workbook.namelist()
                assert b'Test local' in workbook.read('xl/sharedStrings.xml')
            assert json.loads(request('/api/local/runtime'))['phase'] == 'idle'
            request('/api/local/quit', {}, 'POST')
            process.wait(timeout=30)
            # Fixture only: populate a completed report while this disposable app
            # is stopped, so packaging checks never require an AI key or model.
            report = {'summary': 'Séance de test', 'strengths': [],
                      'improvements': [{'point': 'Préciser', 'evidence': 'Un projet React', 'question': 1}],
                      'next_steps': ['Préparer un exemple'], 'employer_questions': ['Quelle équipe ?']}
            turns = [{'question': 'Ton projet ?', 'answer': 'Un projet React', 'feedback': {'strengths': [], 'improvements': ['Préciser']}}]
            with closing(sqlite3.connect(Path(directory) / 'trackit.db')) as connection, connection:
                connection.execute("UPDATE interviewsession SET status = ?, report = ?, turns = ? WHERE id = ?",
                                   ('completed', json.dumps(report), json.dumps(turns), interview_id))
            process = start()
            assert json.loads(request(f'/api/interviews/{interview_id}'))['status'] == 'completed'
            assert request(f'/api/interviews/{interview_id}/report.pdf').startswith(b'%PDF-')
            request(f'/api/interviews/{interview_id}', method='DELETE')
            assert json.loads(request('/api/interviews')) == []
            assert len(json.loads(request('/api/applications'))) == 1
            assert request(f'/api/documents/{document_id}/download') == file_content
            request(f'/api/documents/{document_id}', method='DELETE')
            assert json.loads(request('/api/documents')) == []
            request('/api/user/logout', {})
            try:
                request('/api/applications')
                raise AssertionError('Session still active')
            except urllib.error.HTTPError as error:
                assert error.code == 401
        finally:
            process.terminate()
            process.wait(timeout=20)
        print('Standalone smoke passed: UI, registration, login, CRUD, XLSX export, interview PDF, restart persistence, logout')


if __name__ == '__main__':
    run(str(Path(sys.argv[1]).resolve()))
