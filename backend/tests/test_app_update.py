from io import BytesIO
import json
import sqlite3
from pathlib import Path
from types import SimpleNamespace
import tempfile
import threading
import unittest
from unittest.mock import patch, Mock
import zipfile
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.deps import get_current_user
from app.standalone import configure

from app.services import app_update as update


class UpdateTests(unittest.TestCase):
    def test_versions_and_prereleases(self):
        self.assertGreater(update.version_key('v0.1.0-beta.10'), update.version_key('v0.1.0-beta.9'))
        self.assertGreater(update.version_key('v0.1.0'), update.version_key('v0.1.0-beta.99'))
        self.assertIsNone(update.version_key('main'))

    def test_select_only_newer_complete_official_release(self):
        name = 'TrackIt-windows-x64.zip'
        def release(tag, draft=False):
            return {'tag_name': tag, 'draft': draft, 'assets': [
                {'name': asset, 'browser_download_url': update.DOWNLOADS + tag + '/' + asset}
                for asset in (name, name + '.sha256')]}
        releases = [release('v0.1.0-beta.7'), release('v0.1.0-beta.8', True), release('v0.1.0-beta.5')]
        self.assertEqual(update.select_release(releases, 'v0.1.0-beta.6', name)['version'], 'v0.1.0-beta.7')
        releases[0]['assets'][0]['browser_download_url'] = 'https://example.com/file'
        self.assertIsNone(update.select_release(releases, 'v0.1.0-beta.6', name))
        releases[0]['assets'].pop()
        self.assertIsNone(update.select_release(releases, 'v0.1.0-beta.6', name))

    def test_archive_rejects_traversal_and_external_symlink(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for index, filename in enumerate(('../outside', '/outside')):
                archive = root / f'{index}.zip'
                with zipfile.ZipFile(archive, 'w') as output:
                    output.writestr(filename, 'bad')
                with self.assertRaises(ValueError):
                    update.extract_archive(archive, root / f'out{index}')
            archive = root / 'link.zip'
            info = zipfile.ZipInfo('TrackIt/link')
            info.external_attr = 0o120777 << 16
            with zipfile.ZipFile(archive, 'w') as output:
                output.writestr(info, '../../../outside')
            with self.assertRaises(ValueError):
                update.extract_archive(archive, root / 'out-link')

    def test_replace_preserves_previous_and_restores_on_failure(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target, payload, backup = [root / name for name in ('app', 'new', 'backup')]
            target.mkdir()
            (target / 'old').write_text('old')
            with self.assertRaises(FileNotFoundError):
                update.replace_bundle(target, payload, backup)
            self.assertTrue((target / 'old').exists())
            payload.mkdir()
            (payload / 'new').write_text('new')
            update.replace_bundle(target, payload, backup)
            self.assertTrue((target / 'new').exists())
            self.assertTrue((backup / 'old').exists())

    def test_bad_checksum_never_changes_installed_bundle(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            installed, data = root / 'TrackIt', root / 'data'
            installed.mkdir()
            data.mkdir()
            (installed / 'original').write_text('original')
            manager = update.AppUpdate(data, threading.Event(), [])
            manager.release = {'version': 'v0.1.0-beta.7', 'name': 'update.zip', 'url': update.DOWNLOADS + 'v0.1.0-beta.7/update.zip'}
            checksum = BytesIO(('0' * 64 + '  update.zip').encode())
            download = BytesIO(b'corrupted')
            download.headers = {}
            with patch.object(update, 'bundle_path', return_value=installed), patch.object(update, 'open_url', side_effect=[checksum, download]), patch.object(update.shutil, 'disk_usage', return_value=SimpleNamespace(free=10 * update.MAX_ARCHIVE)):
                with self.assertRaisesRegex(ValueError, 'altéré'):
                    manager.download()
            self.assertTrue((installed / 'original').exists())
            self.assertIsNone(manager.prepared)
            self.assertEqual(list(root.glob('.trackit-update-*')), [])

    def test_failed_start_restores_old_bundle_without_touching_data(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target, payload, stage, data = [root / name for name in ('app', 'payload', 'stage', 'data')]
            for directory in (target, payload, stage, data):
                directory.mkdir()
            (target / 'old').write_text('old')
            (payload / 'new').write_text('new')
            with sqlite3.connect(data / 'trackit.db') as connection:
                connection.execute('CREATE TABLE personal (name TEXT)')
                connection.execute("INSERT INTO personal VALUES ('personal data')")
            connection.close()
            original_data = (data / 'trackit.db').read_bytes()
            config = {'target': str(target), 'payload': str(payload), 'stage': str(stage), 'data': str(data), 'pid': 1, 'version': 'v0.1.0-beta.7', 'args': []}
            manifest = root / 'manifest.json'
            manifest.write_text(json.dumps(config))
            dead = Mock()
            dead.poll.return_value = 1
            with patch.object(update, 'wait_for_parent'), patch.object(update.subprocess, 'Popen', return_value=dead) as spawn:
                self.assertEqual(update.apply_update(manifest), 1)
                self.assertEqual(spawn.call_count, 2)
            self.assertTrue((target / 'old').exists())
            self.assertEqual((data / 'trackit.db').read_bytes(), original_data)
            self.assertTrue((stage / 'trackit-before-update.db').exists())
            self.assertIn('annulée', json.loads((data / 'update-result.json').read_text())['message'])

    def test_source_install_and_concurrent_actions_refused(self):
        with tempfile.TemporaryDirectory() as temp:
            manager = update.AppUpdate(temp, threading.Event(), [])
            with self.assertRaises(ValueError):
                manager.launch(lambda: None)
            manager.state['supported'] = True
            manager.lock.acquire()
            with self.assertRaises(ValueError):
                manager.launch(lambda: None)
            manager.lock.release()

    def test_controls_require_login_and_reject_unknown_actions(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'assets').mkdir()
            (root / 'index.html').write_text('<html></html>')
            app = FastAPI()
            manager = update.AppUpdate(root, threading.Event(), [])
            configure(app, root, Mock(), threading.Event(), manager)
            client = TestClient(app)
            self.assertEqual(client.get('/api/local/update').status_code, 401)
            self.assertEqual(client.post('/api/local/update/install').status_code, 401)
            app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
            self.assertEqual(client.get('/api/local/update').json()['version'], update.APP_VERSION)
            self.assertEqual(client.post('/api/local/update/unknown').status_code, 404)
            self.assertEqual(client.post('/api/local/update/check').status_code, 409)

    def test_download_prepares_verified_bundle_without_stopping_app(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target, data = root / 'TrackIt', root / 'data'
            target.mkdir()
            data.mkdir()
            (target / 'original').write_text('old')
            buffer = BytesIO()
            with zipfile.ZipFile(buffer, 'w') as archive:
                info = zipfile.ZipInfo('TrackIt/TrackIt')
                info.external_attr = 0o100755 << 16
                archive.writestr(info, 'new')
            content = buffer.getvalue()
            import hashlib
            checksum = BytesIO((hashlib.sha256(content).hexdigest() + '  update.zip').encode())
            download = BytesIO(content)
            download.headers = {'Content-Length': str(len(content))}
            stop = threading.Event()
            manager = update.AppUpdate(data, stop, ['--port', '3000'])
            manager.release = {'version': 'v0.1.0-beta.7', 'url': update.DOWNLOADS + 'v0.1.0-beta.7/update.zip', 'name': 'update.zip'}
            with patch.object(update.sys, 'platform', 'linux'), patch.object(update, 'bundle_path', return_value=target), patch.object(update, 'open_url', side_effect=[checksum, download]), patch.object(update.shutil, 'disk_usage', return_value=SimpleNamespace(free=10 * update.MAX_ARCHIVE)):
                manager.download()
            self.assertEqual(manager.state['phase'], 'ready')
            self.assertFalse(stop.is_set())
            self.assertTrue((target / 'original').exists())
            helper, manifest = manager.prepared
            self.assertTrue((helper / 'original').exists())
            config = json.loads(manifest.read_text())
            self.assertEqual((Path(config['payload']) / 'TrackIt').read_text(), 'new')


if __name__ == '__main__':
    unittest.main()
