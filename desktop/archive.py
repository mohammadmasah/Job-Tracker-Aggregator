import hashlib
from pathlib import Path
import shutil
import subprocess
import sys

label = sys.argv[1]
output = Path('desktop/artifacts')
output.mkdir(parents=True, exist_ok=True)
name = output / f'TrackIt-{label}'
if label.startswith('macos'):
    subprocess.run(['ditto', '-c', '-k', '--sequesterRsrc', '--keepParent', 'desktop/dist/TrackIt.app', str(name) + '.zip'], check=True)
    archive = Path(str(name) + '.zip')
else:
    archive = Path(shutil.make_archive(str(name), 'zip' if label.startswith('windows') else 'gztar', 'desktop/dist', 'TrackIt'))
digest = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
Path(str(archive) + '.sha256').write_text(f'{digest}  {archive.name}\n')
