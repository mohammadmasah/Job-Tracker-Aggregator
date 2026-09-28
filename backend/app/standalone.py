"""Web assets and authenticated desktop controls, enabled only by the launcher."""
from pathlib import Path
from fastapi import Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.api.deps import get_current_user


def configure(app, web_root, runtime, stop):
    web_root = Path(web_root).resolve()

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
        return {'app': 'TrackIt', 'mode': 'standalone'}

    app.mount('/assets', StaticFiles(directory=web_root / 'assets'), name='desktop-assets')

    @app.get('/{path:path}')
    def frontend(path: str):
        if path.startswith(('api/', 'chatbot/', 'analyse-cv/')):
            raise HTTPException(404)
        candidate = (web_root / path).resolve()
        if candidate.is_relative_to(web_root) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(web_root / 'index.html')
