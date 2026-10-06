"""Exercise actual bundle replacement/restart using disposable copies on each OS."""
import http.cookiejar
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

from smoke import free_port

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from app.services.app_update import bundle_path, executable_in, extract_archive, asset_name
from app.core.version import APP_VERSION


def run(executable):
    source = bundle_path(executable)
    with tempfile.TemporaryDirectory(prefix='trackit-update-test-') as temp:
        root = Path(temp)
        suffix = '.app' if sys.platform == 'darwin' else ''
        target, payload, helper = [root / (name + suffix) for name in ('installed', 'payload', 'helper')]
        stage, data = root / 'stage', root / 'data'
        for destination in (target, helper):
            shutil.copytree(source, destination, symlinks=True)
        extracted = root / 'extracted'
        extract_archive(Path('desktop/artifacts') / asset_name(), extracted)
        (extracted / ('TrackIt.app' if sys.platform == 'darwin' else 'TrackIt')).rename(payload)
        stage.mkdir()
        data.mkdir()
        (target / 'previous-version-marker').write_text('previous')
        port, api_port = free_port(), free_port()
        args = ['--no-browser', '--port', str(port), '--api-port', str(api_port)]
        env = dict(os.environ, TRACKIT_DATA_DIR=str(data), PYINSTALLER_RESET_ENVIRONMENT='1')
        client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        def request(path, body=None):
            encoded = json.dumps(body).encode() if body is not None else None
            with client.open(urllib.request.Request(f'http://127.0.0.1:{port}' + path, data=encoded, headers={'Content-Type': 'application/json'}), timeout=5) as response:
                return json.load(response)
        process = subprocess.Popen([str(executable_in(target)), *args], env=env)
        installer = None
        try:
            for _ in range(120):
                if process.poll() is not None:
                    raise RuntimeError('Test installation failed to start')
                try:
                    request('/api/local/health')
                    break
                except OSError:
                    time.sleep(0.5)
            request('/api/user/register', {'name': 'Test', 'lastname': 'Update', 'email': 'update@example.invalid', 'password': 'Smoke-Test-123!'})
            request('/api/user/login', {'email': 'update@example.invalid', 'password': 'Smoke-Test-123!'})
            request('/api/applications', {'company': 'Conservée après mise à jour', 'position': 'Développeur'})
            state = request('/api/local/update')
            assert state['supported'] and state['version'] == APP_VERSION
            manifest = stage / 'update.json'
            manifest.write_text(json.dumps({'target': str(target), 'payload': str(payload), 'stage': str(stage), 'data': str(data), 'pid': process.pid, 'version': APP_VERSION, 'args': args}), encoding='utf-8')
            installer = subprocess.Popen([str(executable_in(helper)), '--apply-update', str(manifest)], env=env)
            request('/api/local/quit', {})
            process.wait(timeout=30)
            assert installer.wait(timeout=100) == 0, (data / 'update-result.json').read_text()
            assert not (target / 'previous-version-marker').exists()
            assert (stage / 'previous' / 'previous-version-marker').exists()
            assert request('/api/applications')[0]['company'] == 'Conservée après mise à jour'
            assert 'installée' in request('/api/local/update')['message']
            request('/api/local/quit', {})
            for _ in range(60):
                try:
                    request('/api/local/health')
                    time.sleep(0.5)
                except OSError:
                    break
            # Give the executable time to finish cleanup before removing it on Windows.
            time.sleep(3)
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=20)
            if installer and installer.poll() is None:
                installer.terminate()
                installer.wait(timeout=20)
        print('Update smoke passed: bundle replacement, independent restart, session and application persistence')


if __name__ == '__main__':
    run(str(Path(sys.argv[1]).resolve()))
