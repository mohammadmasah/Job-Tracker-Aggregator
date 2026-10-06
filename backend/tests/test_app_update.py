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

    @staticmethod
    def feed(*tags):
        return ('<feed xmlns="http://www.w3.org/2005/Atom">' + ''.join(
            f'<entry><link rel="alternate" href="https://github.com/{update.REPOSITORY}/releases/tag/{tag}"/></entry>'
            for tag in tags) + '</feed>').encode()

    def test_feed_orders_versions_and_rejects_foreign_links(self):
        feed = self.feed('v0.1.0-beta.6', 'v0.1.0-beta.10', 'v0.1.0-beta.7', 'main')
        candidates = update.release_candidates(feed, 'v0.1.0-beta.6', 'test.zip')
        self.assertEqual([item['version'] for item in candidates], ['v0.1.0-beta.10', 'v0.1.0-beta.7'])
        self.assertEqual(update.release_candidates(feed.replace(update.REPOSITORY.encode(), b'foreign/repo'), 'v0.1.0-beta.6', 'test.zip'), [])
        with self.assertRaises(ValueError):
            update.release_candidates(b'<html/>', 'v0.1.0-beta.6', 'test.zip')

    def test_find_release_never_uses_rest_api_and_verifies_assets(self):
        name = update.asset_name()
        with patch.object(update, 'open_url', side_effect=[BytesIO(self.feed('v0.1.0-beta.7')), BytesIO(('0' * 64 + '  ' + name).encode()), BytesIO()]) as request:
            release = update.find_release('v0.1.0-beta.6', name)
        self.assertEqual(release['version'], 'v0.1.0-beta.7')
        self.assertTrue(all('api.github.com' not in call.args[0] for call in request.call_args_list))
        self.assertEqual(request.call_args_list[-1].kwargs, {'method': 'HEAD'})

    def test_missing_future_assets_are_not_reported_as_up_to_date(self):
        with patch.object(update, 'open_url', side_effect=[BytesIO(self.feed('v0.1.0-beta.7')), update.urllib.error.HTTPError('url', 404, 'missing', {}, None)]):
            with self.assertRaisesRegex(ValueError, 'publication'):
                update.find_release('v0.1.0-beta.6', update.asset_name())

    def test_check_caches_success_and_failure_then_retries(self):
        with tempfile.TemporaryDirectory() as temp:
            manager = update.AppUpdate(temp, threading.Event(), [])
            with patch.object(update, 'find_release', return_value=None) as request:
                manager.check()
                manager.check()
                self.assertEqual(request.call_count, 1)
                self.assertEqual(manager.state['phase'], 'current')
            manager.next_check = 0
            with patch.object(update, 'find_release', side_effect=update.urllib.error.HTTPError('url', 403, 'rate limit exceeded', {}, None)) as request:
                with self.assertLogs(level='ERROR'):
                    manager.check()
                manager.check()
                self.assertEqual(request.call_count, 1)
                self.assertEqual(manager.state['phase'], 'error')
                self.assertIn('temporairement', manager.state['message'])
            manager.next_check = 0
            with patch.object(update, 'find_release', return_value={'version': 'v0.1.0-beta.7'}) as request:
                manager.check()
                self.assertEqual(manager.state['phase'], 'available')

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
