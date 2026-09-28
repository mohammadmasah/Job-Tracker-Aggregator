import tempfile
import time
import unittest
import io
import json
import sqlite3
from unittest.mock import Mock, patch
from pathlib import Path
from app.core.ai_config import DEFAULT_MODEL
from app.core.local_cache import LocalCache
from app.services.local_runtime import LocalRuntime


class StandaloneTests(unittest.TestCase):
    def test_cache_closes_connections_even_after_rollback(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = LocalCache(Path(directory) / 'cache.db')
            with cache.connect() as connection:
                connection.execute('SELECT 1')
            with self.assertRaises(sqlite3.ProgrammingError):
                connection.execute('SELECT 1')
            with self.assertRaises(ValueError):
                with cache.connect() as connection:
                    connection.execute("INSERT INTO cache VALUES ('test', 'value', NULL)")
                    raise ValueError('rollback')
            self.assertIsNone(cache.get('test'))
            with self.assertRaises(sqlite3.ProgrammingError):
                connection.execute('SELECT 1')

    def test_local_cache_survives_restart_and_expires(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'cache.db'
            cache = LocalCache(path)
            self.assertEqual(cache.incr('attempts'), 1)
            self.assertEqual(LocalCache(path).incr('attempts'), 2)
            cache.setex('lock', -1, 'expired')
            self.assertIsNone(cache.get('lock'))
            cache.setex('token', 60, 'secret')
            self.assertEqual(LocalCache(path).get('token'), 'secret')
            cache.delete('token')
            self.assertIsNone(cache.get('token'))

    def test_no_runtime_download_without_activation(self):
        with tempfile.TemporaryDirectory() as directory:
            runtime = LocalRuntime(directory)
            self.assertEqual(runtime.state['phase'], 'idle')
            self.assertIsNone(runtime.executable())
            self.assertEqual(list(Path(directory).iterdir()), [])
            runtime.stop()

    def test_existing_model_starts_without_network_download(self):
        with tempfile.TemporaryDirectory() as directory:
            executable = Path(directory) / 'runtime' / 'bin' / 'ollama'
            executable.parent.mkdir(parents=True)
            executable.touch()
            runtime = LocalRuntime(directory)
            runtime.process = Mock()
            runtime.process.poll.return_value = None
            runtime.lock.acquire()
            response = io.BytesIO(json.dumps({'models': [{'name': DEFAULT_MODEL}]}).encode())
            with patch.dict('os.environ', {'OLLAMA_BASE_URL': 'http://127.0.0.1:11435', 'OLLAMA_MODEL': DEFAULT_MODEL}), \
                 patch.object(runtime, 'executable', return_value=executable), \
                 patch('urllib.request.urlopen', return_value=response) as request:
                runtime.prepare()
            self.assertEqual(runtime.state['phase'], 'ready')
            request.assert_called_once_with('http://127.0.0.1:11435/api/tags', timeout=2)

    def test_executable_search_ignores_library_directory(self):
        with tempfile.TemporaryDirectory() as directory, patch('platform.system', return_value='Linux'):
            root = Path(directory) / 'runtime'
            (root / 'lib' / 'ollama').mkdir(parents=True)
            (root / 'bin').mkdir()
            executable = root / 'bin' / 'ollama'
            executable.touch()
            self.assertEqual(LocalRuntime(directory).executable(), executable)
