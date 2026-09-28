"""Persistent TTL key/value storage for standalone login throttling (no Redis)."""
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path


class LocalCache:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT, expires REAL)')

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.path, timeout=15)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def get(self, key):
        with self.connect() as db:
            row = db.execute('SELECT value, expires FROM cache WHERE key=?', (key,)).fetchone()
            if not row or (row[1] is not None and row[1] <= time.time()):
                return None
            return row[0]

    def setex(self, key, seconds, value):
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO cache VALUES (?, ?, ?)', (key, str(value), time.time() + seconds))

    def set(self, key, value):
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO cache VALUES (?, ?, NULL)', (key, str(value)))

    def delete(self, key):
        with self.connect() as db:
            db.execute('DELETE FROM cache WHERE key=?', (key,))

    def incr(self, key):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT value, expires FROM cache WHERE key=?', (key,)).fetchone()
            valid = row and (row[1] is None or row[1] > time.time())
            value = int(row[0]) + 1 if valid else 1
            expiry = row[1] if valid else time.time() + 900
            db.execute('INSERT OR REPLACE INTO cache VALUES (?, ?, ?)', (key, str(value), expiry))
            return value
