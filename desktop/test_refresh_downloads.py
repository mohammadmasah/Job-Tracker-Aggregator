import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import refresh_downloads as refresh


class RefreshTests(unittest.TestCase):
    def test_refresh_keeps_tag_urls_and_preserves_counts(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp) / 'backup'
            uploads = []
            def gh(*args):
                if args[0] == 'api':
                    return json.dumps({'assets': [{'name': 'old', 'download_count': 3}]})
                if args[1] == 'download':
                    destination = Path(args[args.index('--dir') + 1])
                    destination.mkdir()
                    for name in refresh.ARCHIVES:
                        content = b'old' if destination.name == 'previous' else b'new'
                        (destination / name).write_bytes(content)
                        (destination / (name + '.sha256')).write_text(hashlib.sha256(content).hexdigest() + '  ' + name)
                if args[1] == 'upload':
                    uploads.append(args)
                return ''
            with patch.object(refresh, 'gh', side_effect=gh):
                refresh.refresh('v0.1.0-beta.6', 'v0.1.0-beta.4', directory)
            self.assertEqual(len(uploads), 1)
            self.assertEqual(uploads[0][2], 'v0.1.0-beta.4')
            self.assertEqual(json.loads((directory / 'release-before.json').read_text())['assets'][0]['download_count'], 3)

    def test_failed_verification_reuploads_backups(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp) / 'backup'
            uploads = []
            def gh(*args):
                if args[0] == 'api':
                    return '{}'
                if args[1] == 'download':
                    destination = Path(args[args.index('--dir') + 1])
                    destination.mkdir()
                    for name in refresh.ARCHIVES:
                        (destination / name).write_bytes(b'archive')
                        (destination / (name + '.sha256')).write_text(hashlib.sha256(b'archive').hexdigest() + '  ' + name)
                    if destination.name == 'verified':
                        (destination / refresh.ARCHIVES[0]).write_bytes(b'corrupt')
                if args[1] == 'upload':
                    uploads.append(args)
                return ''
            with patch.object(refresh, 'gh', side_effect=gh), self.assertRaises(ValueError):
                refresh.refresh('v0.1.0-beta.6', 'v0.1.0-beta.4', directory)
            self.assertEqual(len(uploads), 2)
            self.assertTrue(all('/previous/' in filename.replace('\\', '/') for filename in uploads[-1][6:]))


if __name__ == '__main__':
    unittest.main()
