"""Private Ollama runtime managed by the standalone app; no system installation."""
import hashlib
import json
import os
import platform
from pathlib import Path
import shutil
import ssl
import certifi
import subprocess
import tarfile
import threading
import urllib.request
import zipfile
from app.core.ai_config import DEFAULT_MODEL

VERSION = 'v0.34.4'
ASSETS = {
    'Darwin': ('ollama-darwin.tgz', 'e9c8fddaab5f48f47f2c4ae3d23d0732f5182417125353faeed2188e34a22799'),
    'Windows': ('ollama-windows-amd64.zip', '535193f38f3344e5b08f5d1c171c31ce11aa17f0124ff69ae26d8ec7fe06fa62'),
    'Linux': ('ollama-linux-amd64.tar.zst', 'c238986e61d40c0cc5f4a9b9e40b9eea104350b77efa34741fc134e105cb9533'),
}


class LocalRuntime:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.process = None
        self.log = None
        self.lock = threading.Lock()
        self.stopping = threading.Event()
        self.state = {'phase': 'idle', 'message': "Active l'IA locale pour télécharger son moteur et son modèle.", 'progress': 0}

    def update(self, phase, message, progress=0):
        self.state = {'phase': phase, 'message': message, 'progress': progress}

    def activate(self):
        if not self.lock.acquire(blocking=False):
            return
        threading.Thread(target=self.prepare, daemon=True).start()

    def executable(self):
        name = 'ollama.exe' if platform.system() == 'Windows' else 'ollama'
        return next((path for path in (self.directory / 'runtime').rglob(name) if path.is_file()), None)

    def install(self):
        asset, digest = ASSETS[platform.system()]
        target = self.directory / 'runtime'
        staging = self.directory / 'runtime-staging'
        archive = self.directory / asset
        self.update('downloading', "Téléchargement du moteur IA (jusqu'à 1,5 Go)…")
        try:
            checksum = hashlib.sha256()
            url = f'https://github.com/ollama/ollama/releases/download/{VERSION}/{asset}'
            with urllib.request.urlopen(url, timeout=60, context=ssl.create_default_context(cafile=certifi.where())) as response, archive.open('wb') as output:
                size = int(response.headers.get('Content-Length', 0))
                received = 0
                while chunk := response.read(1024 * 1024):
                    if self.stopping.is_set():
                        raise RuntimeError('Arrêt demandé')
                    output.write(chunk)
                    checksum.update(chunk)
                    received += len(chunk)
                    self.update('downloading', 'Téléchargement du moteur IA…', round(received * 100 / size) if size else 0)
            if checksum.hexdigest() != digest:
                raise RuntimeError('Le fichier téléchargé ne correspond pas à la version vérifiée.')
            self.update('installing', 'Préparation du moteur IA…')
            shutil.rmtree(staging, ignore_errors=True)
            staging.mkdir(parents=True)
            if asset.endswith('.zip'):
                with zipfile.ZipFile(archive) as bundle:
                    for item in bundle.infolist():
                        if not (staging / item.filename).resolve().is_relative_to(staging.resolve()):
                            raise RuntimeError('Chemin interdit dans le fichier téléchargé')
                    bundle.extractall(staging)
            elif asset.endswith('.zst'):
                import zstandard
                with archive.open('rb') as source, zstandard.ZstdDecompressor().stream_reader(source) as stream:
                    with tarfile.open(fileobj=stream, mode='r|') as bundle:
                        bundle.extractall(staging, filter='data')
            else:
                with tarfile.open(archive) as bundle:
                    bundle.extractall(staging, filter='data')
            if target.exists():
                shutil.rmtree(target)
            staging.rename(target)
        finally:
            archive.unlink(missing_ok=True)

    def prepare(self):
        try:
            if self.state['phase'] == 'ready':
                return
            if not self.executable():
                self.install()
            executable = self.executable()
            if not executable:
                raise RuntimeError('Moteur IA introuvable dans le téléchargement')
            executable.chmod(executable.stat().st_mode | 0o111)
            base = os.environ['OLLAMA_BASE_URL']
            if not self.process or self.process.poll() is not None:
                self.update('starting', "Démarrage de l'IA locale…")
                env = dict(os.environ, OLLAMA_HOST=base, OLLAMA_MODELS=str(self.directory / 'models'),
                           OLLAMA_NUM_PARALLEL='1', OLLAMA_MAX_LOADED_MODELS='1')
                self.log = (self.directory / 'ollama.log').open('a', encoding='utf-8')
                self.process = subprocess.Popen([str(executable), 'serve'], env=env, stdout=self.log, stderr=self.log,
                                                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
            for _ in range(120):
                if self.stopping.wait(0.5):
                    return
                if self.process.poll() is not None:
                    raise RuntimeError("Le moteur IA n'a pas démarré. Consulte ollama.log.")
                try:
                    with urllib.request.urlopen(f'{base}/api/tags', timeout=2) as response:
                        installed = json.load(response).get('models', [])
                        break
                except OSError:
                    continue
            else:
                raise RuntimeError("Le moteur IA ne répond pas.")
            model = os.getenv('OLLAMA_MODEL', DEFAULT_MODEL)
            if any(item.get('name') == model for item in installed):
                self.update('ready', f'L’IA locale est prête ({model}).', 100)
                return
            self.update('model', f'Téléchargement du modèle léger {model} (environ 1,4 Go)…')
            request = urllib.request.Request(f'{base}/api/pull', data=json.dumps({'name': model, 'stream': True}).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(request, timeout=600) as response:
                for line in response:
                    data = json.loads(line)
                    if data.get('error'):
                        raise RuntimeError(data['error'])
                    self.update('model', 'Préparation du modèle IA…', round(data.get('completed', 0) * 100 / data['total']) if data.get('total') else 0)
                    if self.stopping.is_set():
                        return
            self.update('ready', "L'IA locale est prête.", 100)
        except Exception:
            import logging
            logging.getLogger(__name__).exception('Local AI setup failed')
            self.update('error', "Installation de l'IA interrompue. Vérifie ta connexion et l'espace disque, puis réessaie.")
        finally:
            self.lock.release()

    def stop(self):
        self.stopping.set()
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.process.kill()
        if self.log:
            self.log.close()
