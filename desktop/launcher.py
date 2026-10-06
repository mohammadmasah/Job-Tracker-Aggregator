"""TrackIt standalone entry point, bundled with Python and the compiled web UI."""
import argparse
import logging
import multiprocessing
import os
from pathlib import Path
import secrets
import socket
import sys
import threading
import time
import webbrowser
from app.core.ai_config import DEFAULT_MODEL


def data_directory():
    override = os.getenv('TRACKIT_DATA_DIR')
    if override:
        return Path(override).expanduser().resolve()
    if sys.platform == 'win32':
        return Path(os.environ['LOCALAPPDATA']) / 'TrackIt'
    if sys.platform == 'darwin':
        return Path.home() / 'Library' / 'Application Support' / 'TrackIt'
    return Path(os.getenv('XDG_DATA_HOME', str(Path.home() / '.local' / 'share'))) / 'TrackIt'


def prepare_environment(directory):
    directory.mkdir(parents=True, exist_ok=True)
    secret = directory / 'session.key'
    try:
        with secret.open('x', encoding='utf-8') as file:
            file.write(secrets.token_urlsafe(48))
        secret.chmod(0o600)
    except FileExistsError:
        pass
    (directory / 'uploads').mkdir(exist_ok=True)
    os.environ.update(TRACKIT_STANDALONE='1', TRACKIT_DATA_DIR=str(directory),
                      DATABASE_URL='sqlite:///' + (directory / 'trackit.db').as_posix(),
                      SECRET_KEY=secret.read_text().strip(), PYTHON_DOTENV_DISABLED='1',
                      OLLAMA_BASE_URL='http://127.0.0.1:11435', OLLAMA_MODEL=DEFAULT_MODEL)
    os.chdir(directory)


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--apply-update':
        from app.services.app_update import apply_update
        raise SystemExit(apply_update(sys.argv[2]))
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--port', type=int, default=3000)
    parser.add_argument('--api-port', type=int, default=8000)
    args = parser.parse_args()
    directory = data_directory()
    prepare_environment(directory)
    logging.basicConfig(filename=directory / 'trackit.log', level=logging.INFO)
    # Windowed executables have no console; give Uvicorn valid output streams.
    if sys.stdout is None:
        sys.stdout = (directory / 'console.log').open('a', encoding='utf-8')
    if sys.stderr is None:
        sys.stderr = sys.stdout
    root = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent.parent))
    web_root = root / 'web' if getattr(sys, 'frozen', False) else root / 'frontend' / 'dist'
    sockets = []
    runtime = None
    servers = []
    try:
        for port in dict.fromkeys([args.port, args.api_port]):
            sock = socket.socket()
            sockets.append(sock)
            if os.name == 'nt':
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            else:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(('127.0.0.1', port))
            sock.listen(128)
        import uvicorn
        from app.main import app
        from app.database import create_db_and_tables
        create_db_and_tables()
        from app.standalone import configure
        from app.services.local_runtime import LocalRuntime
        from app.services.app_update import AppUpdate
        stop = threading.Event()
        runtime = LocalRuntime(directory)
        updater = AppUpdate(directory, stop, sys.argv[1:])
        configure(app, web_root, runtime, stop, updater)
        threads = []
        for sock in sockets:
            server = uvicorn.Server(uvicorn.Config(app, log_config=None, lifespan="off"))
            servers.append(server)
            thread = threading.Thread(target=server.run, kwargs={'sockets': [sock]}, daemon=True)
            thread.start()
            threads.append(thread)
        for _ in range(200):
            if all(server.started for server in servers):
                break
            if any(not thread.is_alive() for thread in threads):
                raise RuntimeError('Le serveur local a échoué au démarrage.')
            time.sleep(0.1)
        else:
            raise RuntimeError('Le serveur local ne répond pas.')
        if runtime.executable():
            runtime.activate()
        if not args.no_browser:
            webbrowser.open(f'http://localhost:{args.port}')
        while not stop.wait(0.5):
            if any(not thread.is_alive() for thread in threads):
                break
    except KeyboardInterrupt:
        pass
    except Exception as error:
        logging.exception('Startup failed')
        if args.no_browser:
            raise
        from html import escape
        report = directory / 'startup-error.html'
        report.write_text('<meta charset="utf-8"><title>TrackIt</title><h1>TrackIt ne peut pas démarrer</h1>'
                          '<p>Ferme les autres instances de TrackIt ou les services Docker utilisant les ports 3000 et 8000, puis réessaie.</p>'
                          f'<pre>{escape(str(error))}</pre><p>Journal : {escape(str(directory / "trackit.log"))}</p>', encoding='utf-8')
        webbrowser.open(report.as_uri())
    finally:
        for server in servers:
            server.should_exit = True
        for thread in locals().get('threads', []):
            thread.join(timeout=10)
        if runtime:
            runtime.stop()
        for sock in sockets:
            sock.close()


if __name__ == '__main__':
    multiprocessing.freeze_support()
    main()
