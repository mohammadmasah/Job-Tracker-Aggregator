"""Build on the target OS; never packages the developer's database or .env."""
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
if not (ROOT / 'frontend/dist/index.html').is_file():
    raise SystemExit('Build the frontend first with VITE_STANDALONE=1 npm run build')
command = [sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean', '--onedir',
           '--name', 'TrackIt', '--distpath', 'desktop/dist', '--workpath', 'desktop/build',
           '--specpath', 'desktop/build', '--paths', 'backend',
           '--add-data', f'{ROOT / "frontend" / "dist"}{os.pathsep}web',
           '--collect-submodules', 'app', '--collect-submodules', 'uvicorn',
           '--collect-all', 'langchain_core', '--collect-all', 'langchain_ollama',
           '--collect-all', 'langsmith', '--collect-all', 'pypdfium2',
           '--collect-all', 'pdfminer', '--copy-metadata', 'sqlmodel',
           '--copy-metadata', 'ollama', '--copy-metadata', 'redis']
if sys.platform in ('darwin', 'win32'):
    command += ['--windowed']
if sys.platform == 'darwin':
    command += ['--osx-bundle-identifier', 'com.trackit.local']
command += ['desktop/launcher.py']
subprocess.run(command, check=True)
