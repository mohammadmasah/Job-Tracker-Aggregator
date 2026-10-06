"""Explicitly refresh stable shared release URLs; back up assets and download counts first.

Usage: python desktop/refresh_downloads.py SOURCE_TAG TARGET_TAG BACKUP_DIRECTORY
Does not move Git tags. Ordinary publication deliberately never calls this command.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

from publish import ARCHIVES

REPO = 'mohammadmasah/Job-Tracker-Aggregator'


def gh(*args):
    return subprocess.run(['gh', *args], check=True, capture_output=True, text=True).stdout


def verify(directory):
    for name in ARCHIVES:
        expected, filename = (directory / (name + '.sha256')).read_text().split()
        with (directory / name).open('rb') as source:
            actual = hashlib.file_digest(source, 'sha256').hexdigest()
        if filename != name or actual != expected:
            raise ValueError(f'Invalid archive/checksum pair: {name}')


def refresh(source_tag, target_tag, directory):
    if source_tag == target_tag or not all(tag.startswith('v') and '/' not in tag for tag in (source_tag, target_tag)):
        raise ValueError('Provide distinct version tags.')
    directory = Path(directory).resolve()
    directory.mkdir(parents=True, exist_ok=False)
    metadata = json.loads(gh('api', f'repos/{REPO}/releases/tags/{target_tag}'))
    if metadata.get('immutable') or metadata.get('draft'):
        raise ValueError('Cannot refresh an immutable or draft release.')
    (directory / 'release-before.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    old, new = directory / 'previous', directory / 'new'
    for tag, destination in ((target_tag, old), (source_tag, new)):
        gh('release', 'download', tag, '--repo', REPO, '--pattern', 'TrackIt-*', '--dir', str(destination))
        verify(destination)
    files = [filename for name in ARCHIVES for filename in (name, name + '.sha256')]
    try:
        gh('release', 'upload', target_tag, '--repo', REPO, '--clobber', *[str(new / name) for name in files])
        downloaded = directory / 'verified'
        gh('release', 'download', target_tag, '--repo', REPO, '--pattern', 'TrackIt-*', '--dir', str(downloaded))
        verify(downloaded)
        for name in files:
            if (downloaded / name).read_bytes() != (new / name).read_bytes():
                raise ValueError(f'Remote download differs: {name}')
    except Exception:
        gh('release', 'upload', target_tag, '--repo', REPO, '--clobber', *[str(old / name) for name in files])
        raise
    print(f'{target_tag}: verified {source_tag} assets at the original URLs. Previous assets/counts saved in {directory}.')


if __name__ == '__main__':
    refresh(*sys.argv[1:])
