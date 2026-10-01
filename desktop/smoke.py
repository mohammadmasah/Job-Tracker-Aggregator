"""Exercise the built executable with an isolated data directory; no real data."""
import json
import os
from pathlib import Path
import socket
import subprocess
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
            for path in ['/api/applications', '/api/contacts', '/api/documents']:
                assert json.loads(request(path)) == [], f'Fresh installation contains data: {path}'
            assert json.loads(request('/chatbot/history/'))['messages'] == []
            request('/api/applications', {'company': 'Test local', 'position': 'Développeur'})
            assert len(json.loads(request('/api/applications'))) == 1
            with ZipFile(BytesIO(request('/api/applications/export.xlsx'))) as workbook:
                assert 'xl/worksheets/sheet2.xml' in workbook.namelist()
                assert b'Test local' in workbook.read('xl/sharedStrings.xml')
            assert json.loads(request('/api/local/runtime'))['phase'] == 'idle'
            request('/api/local/quit', {}, 'POST')
            process.wait(timeout=30)
            process = start()
            assert len(json.loads(request('/api/applications'))) == 1
            request('/api/user/logout', {})
            try:
                request('/api/applications')
                raise AssertionError('Session still active')
            except urllib.error.HTTPError as error:
                assert error.code == 401
        finally:
            process.terminate()
            process.wait(timeout=20)
        print('Standalone smoke passed: UI, registration, login, CRUD, XLSX export, restart persistence, logout')


if __name__ == '__main__':
    run(str(Path(sys.argv[1]).resolve()))
