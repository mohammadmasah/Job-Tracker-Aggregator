import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from publish import ARCHIVES, publish


class PublishTests(unittest.TestCase):
    def test_existing_release_is_successful_without_mutation(self):
        assets = [{'name': name + suffix, 'state': 'uploaded'} for name in ARCHIVES for suffix in ['', '.sha256']]
        with patch('publish.gh', return_value=json.dumps({'assets': assets, 'isDraft': False})) as gh:
            publish('v1', 'not-needed')
            self.assertEqual(gh.call_count, 1)

    def test_auth_error_does_not_attempt_creation(self):
        with patch('publish.gh', side_effect=subprocess.CalledProcessError(1, 'gh', stderr='HTTP 403')) as gh:
            with self.assertRaises(subprocess.CalledProcessError):
                publish('v1', 'not-needed')
            self.assertEqual(gh.call_count, 1)

    def test_new_release_validates_archives_before_creation(self):
        with tempfile.TemporaryDirectory() as directory:
            for name in ARCHIVES:
                (Path(directory) / name).write_bytes(b'test archive')
                (Path(directory) / (name + '.sha256')).write_text(hashlib.sha256(b'test archive').hexdigest() + '  ' + name)
            missing = subprocess.CalledProcessError(1, 'gh', stderr='release not found')
            with patch('publish.gh', side_effect=[missing, '']) as gh:
                publish('v1', directory)
                self.assertEqual(gh.call_args.args[:3], ('release', 'create', 'v1'))
                self.assertIn('--verify-tag', gh.call_args.args)

    def test_partial_pair_is_not_overwritten(self):
        with patch('publish.gh', return_value=json.dumps({'assets': [{'name': ARCHIVES[0], 'state': 'uploaded'}], 'isDraft': False})) as gh:
            with self.assertRaisesRegex(RuntimeError, 'Incomplete published pair'):
                publish('v1', 'not-needed')
            self.assertEqual(gh.call_count, 1)
