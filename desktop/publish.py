"""Publish verified archives without overwriting an existing release or its notes."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ARCHIVES = ['TrackIt-linux-x64.tar.gz', 'TrackIt-windows-x64.zip',
            'TrackIt-macos-arm64.zip', 'TrackIt-macos-x64.zip']


def gh(*args):
    return subprocess.run(['gh', *args], text=True, capture_output=True, check=True).stdout


def publish(tag, directory):
    if not tag.startswith('v') or tag.startswith('-'):
        raise ValueError('Expected a version tag starting with v')
    try:
        release = json.loads(gh('release', 'view', tag, '--json', 'assets,isDraft'))
    except subprocess.CalledProcessError as error:
        if 'release not found' not in (error.stderr or '').lower():
            raise
        release = None
    existing = {asset['name'] for asset in release['assets'] if asset['state'] == 'uploaded'} if release else set()
    files = []
    for name in ARCHIVES:
        pair = {name, name + '.sha256'}
        if pair <= existing:
            continue
        if pair & existing:
            raise RuntimeError(f'Incomplete published pair for {name}; preserve the existing file and repair its matching checksum before retrying.')
        archive = Path(directory) / name
        checksum = Path(directory) / (name + '.sha256')
        expected, filename = checksum.read_text().split()
        with archive.open('rb') as stream:
            actual = hashlib.file_digest(stream, 'sha256').hexdigest()
        if filename != name or expected != actual:
            raise ValueError(f'Invalid checksum: {name}')
        files += [str(archive), str(checksum)]
    if release is None:
        gh('release', 'create', tag, *files, '--verify-tag', '--title', f'TrackIt {tag}', '--generate-notes', '--prerelease')
    else:
        if files:
            gh('release', 'upload', tag, *files)
        if release['isDraft']:
            gh('release', 'edit', tag, '--draft=false', '--prerelease')
    print(f'Release {tag}: all four archive/checksum pairs published; existing assets and notes preserved.')


if __name__ == '__main__':
    publish(sys.argv[1], sys.argv[2])
