"""Opt-in updates for the portable build, from this project's GitHub releases only."""
import hashlib
from contextlib import closing
import json
import logging
import os
from pathlib import Path
import platform
import re
import shutil
import ssl
import sqlite3
import stat
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import urllib.request
import zipfile
import certifi

from app.core.version import APP_VERSION

REPOSITORY = 'mohammadmasah/Job-Tracker-Aggregator'
RELEASES = f'https://api.github.com/repos/{REPOSITORY}/releases?per_page=100'
DOWNLOADS = f'https://github.com/{REPOSITORY}/releases/download/'
MAX_ARCHIVE = 1024 * 1024 * 1024


def version_key(value):
    match = re.fullmatch(r'v(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?', value)
    if not match:
        return None
    major, minor, patch, beta = match.groups()
    return (int(major), int(minor), int(patch), int(beta) if beta else float('inf'))


def asset_name():
    machine = platform.machine().lower()
    if sys.platform == 'darwin':
        label = 'macos-arm64' if machine in ('arm64', 'aarch64') else 'macos-x64'
    elif machine in ('amd64', 'x86_64') and sys.platform in ('win32', 'linux'):
        label = 'windows-x64' if sys.platform == 'win32' else 'linux-x64'
    else:
        raise ValueError('Ce système ne dispose pas encore de mise à jour automatique.')
    return f'TrackIt-{label}' + ('.tar.gz' if label.startswith('linux') else '.zip')


def bundle_path(executable):
    executable = Path(executable).resolve()
    return executable.parents[2] if sys.platform == 'darwin' else executable.parent


def executable_in(bundle):
    if sys.platform == 'darwin':
        return bundle / 'Contents' / 'MacOS' / 'TrackIt'
    return bundle / ('TrackIt.exe' if sys.platform == 'win32' else 'TrackIt')


def open_url(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={
        'User-Agent': 'TrackIt/' + APP_VERSION, 'Accept': 'application/vnd.github+json'
    }), timeout=30, context=ssl.create_default_context(cafile=certifi.where()))


def select_release(releases, current, name):
    candidates = []
    for release in releases:
        tag = release.get('tag_name', '')
        key = version_key(tag)
        assets = {item['name']: item for item in release.get('assets', [])}
        if (release.get('draft') or key is None or key <= version_key(current)
                or name not in assets or name + '.sha256' not in assets):
            continue
        expected = DOWNLOADS + tag + '/' + name
        if (assets[name].get('browser_download_url') != expected
                or assets[name + '.sha256'].get('browser_download_url') != expected + '.sha256'):
            continue
        candidates.append((key, {'version': tag, 'url': expected, 'name': name}))
    return max(candidates, key=lambda item: item[0])[1] if candidates else None


def extract_archive(archive, destination):
    """Preserve bundle permissions and internal symlinks; reject escaping members."""
    destination.mkdir()
    if archive.name.endswith('.tar.gz'):
        with tarfile.open(archive) as source:
            if sum(member.size for member in source.getmembers()) > 4 * MAX_ARCHIVE:
                raise ValueError('Archive trop volumineuse.')
            source.extractall(destination, filter='data')
    else:
        with zipfile.ZipFile(archive) as source:
            if sum(info.file_size for info in source.infolist()) > 4 * MAX_ARCHIVE:
                raise ValueError('Archive trop volumineuse.')
            for info in source.infolist():
                target = destination / info.filename
                if not target.resolve().is_relative_to(destination.resolve()):
                    raise ValueError('Chemin non autorisé dans l’archive.')
                mode = info.external_attr >> 16
                if stat.S_ISLNK(mode):
                    link = source.read(info).decode('utf-8')
                    if not (target.parent / link).resolve().is_relative_to(destination.resolve()):
                        raise ValueError('Lien non autorisé dans l’archive.')
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.symlink_to(link)
                else:
                    source.extract(info, destination)
                    if mode and not info.is_dir():
                        target.chmod(mode & 0o777)


def independent_environment():
    return dict(os.environ, PYINSTALLER_RESET_ENVIRONMENT='1')


class AppUpdate:
    def __init__(self, directory, stop, args):
        self.directory = Path(directory)
        self.stop = stop
        self.args = args
        self.lock = threading.Lock()
        self.release = None
        self.prepared = None
        self.state = {'phase': 'idle', 'version': APP_VERSION,
                      'supported': bool(getattr(sys, 'frozen', False)),
                      'message': 'Vérifie si une nouvelle version est disponible.', 'progress': 0}
        report = self.directory / 'update-result.json'
        if report.exists():
            try:
                self.state['message'] = json.loads(report.read_text())['message']
            except (OSError, ValueError, KeyError):
                pass

    def launch(self, action):
        if not self.state['supported']:
            raise ValueError('Disponible uniquement dans l’application téléchargée.')
        if not self.lock.acquire(blocking=False):
            raise ValueError('Une opération est déjà en cours.')
        def work():
            try:
                action()
            except Exception as error:
                logging.exception('Application update failed')
                self.state.update(phase='error', message=f'Mise à jour interrompue : {error}', progress=0)
            finally:
                self.lock.release()
        threading.Thread(target=work, daemon=True).start()

    def check(self):
        self.state.update(phase='checking', message='Recherche de mises à jour…')
        with open_url(RELEASES) as response:
            releases = json.load(response)
        self.release = select_release(releases, APP_VERSION, asset_name())
        self.state.update(phase='available' if self.release else 'current',
                          available_version=self.release['version'] if self.release else None,
                          message=('Une nouvelle version est disponible.' if self.release else 'Tu utilises la dernière version.'))

    def download(self):
        if not self.release:
            raise ValueError('Vérifie d’abord les mises à jour.')
        target = bundle_path(sys.executable)
        if self.directory.resolve().is_relative_to(target):
            raise ValueError('Déplace tes données en dehors du dossier de l’application avant la mise à jour.')
        # Retain one recovery copy, then remove it only when preparing another update.
        report = self.directory / 'update-result.json'
        if report.exists():
            previous = json.loads(report.read_text(encoding='utf-8'))
            old_stage = Path(previous.get('stage', ''))
            if (previous.get('success') and old_stage.name.startswith('.trackit-update-')
                    and old_stage.parent == target.parent and not old_stage.is_symlink()
                    and old_stage.is_dir()):
                shutil.rmtree(old_stage)
        # A sibling staging folder guarantees same-filesystem renames and tests write permission.
        try:
            stage = Path(tempfile.mkdtemp(prefix='.trackit-update-', dir=target.parent))
        except PermissionError as error:
            raise ValueError('Place TrackIt dans un dossier où tu peux écrire, puis relance-le (sur Mac : Applications).') from error
        stage.chmod(0o700)
        try:
            if shutil.disk_usage(stage).free < 3 * MAX_ARCHIVE:
                raise ValueError('Prévois au moins 3 Go d’espace libre pour la mise à jour.')
            self.state.update(phase='downloading', message='Téléchargement de la mise à jour…', progress=0)
            release = dict(self.release)
            with open_url(release['url'] + '.sha256') as response:
                checksum = response.read(1024).decode().split()
            if len(checksum) != 2 or not re.fullmatch('[a-fA-F0-9]{64}', checksum[0]) or checksum[1] != release['name']:
                raise ValueError('Empreinte de vérification invalide.')
            archive = stage / release['name']
            digest, downloaded = hashlib.sha256(), 0
            with open_url(release['url']) as response, archive.open('wb') as output:
                total = int(response.headers.get('Content-Length', 0))
                while chunk := response.read(1024 * 1024):
                    downloaded += len(chunk)
                    if downloaded > MAX_ARCHIVE:
                        raise ValueError('Archive trop volumineuse.')
                    output.write(chunk)
                    digest.update(chunk)
                    self.state['progress'] = min(99, round(downloaded * 100 / total)) if total else 0
            if digest.hexdigest() != checksum[0].lower():
                raise ValueError('Le fichier téléchargé est incomplet ou altéré. Réessaie.')
            self.state.update(phase='preparing', message='Vérification et préparation…', progress=100)
            extracted = stage / 'extracted'
            extract_archive(archive, extracted)
            payload = extracted / ('TrackIt.app' if sys.platform == 'darwin' else 'TrackIt')
            if not executable_in(payload).is_file():
                raise ValueError('L’archive ne contient pas l’application attendue.')
            # The helper uses a copy of the CURRENT executable, never the target it replaces.
            helper = stage / target.name
            shutil.copytree(target, helper, symlinks=True)
            config = {'target': str(target), 'payload': str(payload), 'stage': str(stage),
                      'data': str(self.directory), 'pid': os.getpid(), 'version': release['version'],
                      'args': self.args}
            manifest = stage / 'update.json'
            manifest.write_text(json.dumps(config), encoding='utf-8')
            self.prepared = (helper, manifest)
            self.state.update(phase='ready', message='Mise à jour prête. Enregistre ton travail, puis redémarre TrackIt.')
        except Exception:
            shutil.rmtree(stage)
            raise

    def install(self):
        if self.state['phase'] != 'ready' or not self.prepared:
            raise ValueError('Télécharge d’abord la mise à jour.')
        helper, manifest = self.prepared
        subprocess.Popen([str(executable_in(helper)), '--apply-update', str(manifest)],
                         env=independent_environment(), cwd=helper.parent,
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.state.update(phase='restarting', message='Redémarrage en cours…')
        self.stop.set()


def wait_for_parent(pid):
    if sys.platform == 'win32':
        import ctypes
        from ctypes import wintypes
        kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        kernel.OpenProcess.restype = wintypes.HANDLE
        kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        handle = kernel.OpenProcess(0x100000, False, pid)
        if handle:
            try:
                if kernel.WaitForSingleObject(handle, 60000) != 0:
                    raise RuntimeError('TrackIt ne s’est pas arrêté.')
            finally:
                kernel.CloseHandle(handle)
    else:
        for _ in range(120):
            try:
                os.kill(pid, 0)
            except ProcessLookupError:
                return
            time.sleep(0.5)
        raise RuntimeError('TrackIt ne s’est pas arrêté.')


def replace_bundle(target, payload, backup):
    """Never delete the old bundle: restore it if the second rename fails."""
    target.rename(backup)
    try:
        payload.rename(target)
    except Exception:
        backup.rename(target)
        raise


def apply_update(manifest):
    config = json.loads(Path(manifest).read_text(encoding='utf-8'))
    target, payload, stage, data = [Path(config[key]) for key in ('target', 'payload', 'stage', 'data')]
    backup = stage / 'previous'
    report = data / 'update-result.json'
    child = None
    parent_exited = False
    def write(message):
        report.write_text(json.dumps({'message': message, 'stage': str(stage), 'success': False}), encoding='utf-8')
    def start():
        return subprocess.Popen([str(executable_in(target)), *config['args']],
                                env=independent_environment(), cwd=data,
                                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        wait_for_parent(config['pid'])
        parent_exited = True
        database = data / 'trackit.db'
        if database.exists():
            # SQLite's backup API also includes committed data still in the WAL file.
            with closing(sqlite3.connect(database)) as source, closing(sqlite3.connect(stage / 'trackit-before-update.db')) as snapshot:
                source.backup(snapshot)
        replace_bundle(target, payload, backup)
        write('Mise à jour installée : ' + config['version'] + '. Tes données sont conservées.')
        child = start()
        args = config['args']
        port = args[args.index('--port') + 1] if '--port' in args else '3000'
        for _ in range(120):
            if child.poll() is not None:
                raise RuntimeError('La nouvelle version ne démarre pas.')
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/local/health', timeout=1) as response:
                    health = json.load(response)
                if health.get('version') == config['version'] and health.get('pid') == child.pid:
                    report.write_text(json.dumps({'message': 'Mise à jour installée : ' + config['version'] + '. Tes données sont conservées.', 'stage': str(stage), 'success': True}), encoding='utf-8')
                    return 0
            except (OSError, ValueError):
                pass
            time.sleep(0.5)
        raise RuntimeError('La nouvelle version ne répond pas.')
    except Exception as error:
        if child and child.poll() is None:
            child.terminate()
            child.wait(timeout=20)
        if backup.exists():
            if target.exists():
                target.rename(stage / 'failed')
            backup.rename(target)
        write(f'Mise à jour annulée : {error} La version précédente est conservée.')
        if parent_exited and target.exists():
            start()
        return 1
