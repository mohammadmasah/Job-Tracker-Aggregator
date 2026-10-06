"""Build a disposable newer version and exercise discovery, download, install and restart.

The fixture server is used only by this test controller. Production binaries have no
alternate update URL or version override. The simulated release is never published.
"""
import hashlib
import http.cookiejar
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from unittest.mock import patch

from smoke import free_port

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.services import app_update as update
from app.core.version import APP_VERSION


def next_build(root):
    """Compile a real higher-version executable in a separate source tree."""
    key = update.version_key(APP_VERSION)
    version = (f'v{key[0]}.{key[1]}.{key[2]}-beta.{key[3] + 1}' if '-beta.' in APP_VERSION
               else f'v{key[0]}.{key[1]}.{key[2] + 1}-beta.1')
    build = root / 'future-source'
    shutil.copytree(ROOT / 'backend' / 'app', build / 'backend' / 'app', ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    shutil.copytree(ROOT / 'frontend' / 'dist', build / 'frontend' / 'dist')
    (build / 'desktop').mkdir()
    for name in ('build.py', 'launcher.py', 'archive.py'):
        shutil.copy2(ROOT / 'desktop' / name, build / 'desktop' / name)
    (build / 'backend' / 'app' / 'core' / 'version.py').write_text(f'APP_VERSION = {version!r}\n')
    env = dict(os.environ, GITHUB_REF_TYPE='branch', GITHUB_REF_NAME='update-test')
    with (root / 'future-build.log').open('w') as log:
        subprocess.run([sys.executable, str(build / 'desktop' / 'build.py')], cwd=build, env=env, stdout=log, stderr=log, check=True)
        label = update.asset_name().removeprefix('TrackIt-').removesuffix('.tar.gz').removesuffix('.zip')
        subprocess.run([sys.executable, str(build / 'desktop' / 'archive.py'), label], cwd=build, env=env, stdout=log, stderr=log, check=True)
    return version, build / 'desktop' / 'artifacts' / update.asset_name()


def run(executable):
    source = update.bundle_path(executable)
    with tempfile.TemporaryDirectory(prefix='trackit-update-test-') as temp:
        root = Path(temp)
        future_version, archive = next_build(root)
        target = root / ('installed.app' if sys.platform == 'darwin' else 'installed')
        data = root / 'data'
        shutil.copytree(source, target, symlinks=True)
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

        fixtures = root / 'fixtures'
        fixtures.mkdir()
        shutil.copy2(archive, fixtures / archive.name)
        with archive.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        (fixtures / (archive.name + '.sha256')).write_text(f'{digest}  {archive.name}\n')
        (fixtures / 'releases.atom').write_text(f'<feed xmlns="http://www.w3.org/2005/Atom"><entry><link rel="alternate" href="https://github.com/{update.REPOSITORY}/releases/tag/{future_version}"/></entry></feed>')
        class QuietHandler(SimpleHTTPRequestHandler):
            def log_message(self, *args):
                pass
        fixture_server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(fixtures)))
        fixture_thread = threading.Thread(target=fixture_server.serve_forever, daemon=True)
        fixture_thread.start()
        fixture_base = f'http://127.0.0.1:{fixture_server.server_port}/'
        def fixture_request(url, method='GET'):
            if url == update.RELEASES:
                name = 'releases.atom'
            elif url in (update.DOWNLOADS + future_version + '/' + archive.name, update.DOWNLOADS + future_version + '/' + archive.name + '.sha256'):
                name = url.rsplit('/', 1)[1]
            else:
                raise AssertionError('Unexpected network request: ' + url)
            return urllib.request.urlopen(urllib.request.Request(fixture_base + name, method=method), timeout=10)

        process = subprocess.Popen([str(update.executable_in(target)), *args], env=env)
        restarted = False
        try:
            for _ in range(120):
                if process.poll() is not None:
                    raise RuntimeError('Test installation failed to start')
                try:
                    assert request('/api/local/health')['version'] == APP_VERSION
                    break
                except OSError:
                    time.sleep(0.5)
            request('/api/user/register', {'name': 'Test', 'lastname': 'Update', 'email': 'update@example.invalid', 'password': 'Smoke-Test-123!'})
            request('/api/user/login', {'email': 'update@example.invalid', 'password': 'Smoke-Test-123!'})
            request('/api/applications', {'company': 'Conservée après mise à jour', 'position': 'Développeur'})
            assert request('/api/local/update')['supported']
            manager = update.AppUpdate(data, threading.Event(), args)
            with patch.object(update, 'open_url', side_effect=fixture_request), patch.object(update, 'bundle_path', return_value=target):
                manager.check()
                assert manager.state['phase'] == 'available', manager.state
                assert manager.release['version'] == future_version
                with patch.object(update.os, 'getpid', return_value=process.pid):
                    manager.download()
                assert manager.state['phase'] == 'ready', manager.state
            # Capture the real detached helper so the test can wait for its result.
            spawn = subprocess.Popen
            helpers = []
            def capture(*call_args, **kwargs):
                child = spawn(*call_args, **kwargs)
                helpers.append(child)
                return child
            with patch.object(update.subprocess, 'Popen', side_effect=capture), patch.dict(os.environ, env):
                manager.install()
            assert manager.stop.is_set()
            request('/api/local/quit', {})
            process.wait(timeout=30)
            assert helpers[0].wait(timeout=100) == 0, (data / 'update-result.json').read_text()
            restarted = True
            assert request('/api/local/health')['version'] == future_version
            assert not (target / 'previous-version-marker').exists()
            config = json.loads(manager.prepared[1].read_text())
            assert (Path(config['stage']) / 'previous' / 'previous-version-marker').exists()
            assert request('/api/applications')[0]['company'] == 'Conservée après mise à jour'
            assert 'installée' in request('/api/local/update')['message']
            print(f'Update smoke passed: {APP_VERSION} -> {future_version}; discovery, HTTP download, SHA-256, install, independent restart, session and data persistence')
        finally:
            fixture_server.shutdown()
            fixture_server.server_close()
            fixture_thread.join(timeout=5)
            if restarted:
                request('/api/local/quit', {})
                for _ in range(60):
                    try:
                        request('/api/local/health')
                        time.sleep(0.5)
                    except OSError:
                        break
                time.sleep(3)
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=20)


if __name__ == '__main__':
    run(str(Path(sys.argv[1]).resolve()))
