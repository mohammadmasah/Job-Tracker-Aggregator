import tempfile
import time
import unittest
from pathlib import Path
from app.core.local_cache import LocalCache
from app.services.local_runtime import LocalRuntime


class StandaloneTests(unittest.TestCase):
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
