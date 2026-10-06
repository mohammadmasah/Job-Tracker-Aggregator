"""Web assets and authenticated desktop controls, enabled only by the launcher."""
from pathlib import Path
import os
from fastapi import Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.api.deps import get_current_user
from app.core.version import APP_VERSION


def configure(app, web_root, runtime, stop, updater=None):
    web_root = Path(web_root).resolve()

    @app.get('/api/local/update', dependencies=[Depends(get_current_user)])
    def update_status():
        if updater is None:
            raise HTTPException(404)
        return updater.state

    @app.post('/api/local/update/{action}', dependencies=[Depends(get_current_user)])
    def update_action(action: str):
        if updater is None or action not in ('check', 'download', 'install'):
            raise HTTPException(404)
        try:
            updater.launch(getattr(updater, action))
        except ValueError as error:
            raise HTTPException(409, str(error)) from error
        return {'message': 'Opération démarrée'}

    @app.get('/api/local/runtime', dependencies=[Depends(get_current_user)])
    def runtime_status():
        return runtime.state

    @app.post('/api/local/runtime', dependencies=[Depends(get_current_user)])
    def activate_runtime():
        runtime.activate()
        return {'message': 'Préparation démarrée'}

    @app.post('/api/local/quit', dependencies=[Depends(get_current_user)])
    def quit_app():
        stop.set()
        return {'message': 'Arrêt de TrackIt'}

    @app.get('/api/local/health')
    def health():
        return {'app': 'TrackIt', 'mode': 'standalone', 'version': APP_VERSION, 'pid': os.getpid()}

    app.mount('/assets', StaticFiles(directory=web_root / 'assets'), name='desktop-assets')

    @app.get('/{path:path}')
    def frontend(path: str):
        if path.startswith(('api/', 'chatbot/', 'analyse-cv/')):
            raise HTTPException(404)
        candidate = (web_root / path).resolve()
        if candidate.is_relative_to(web_root) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(web_root / 'index.html')
