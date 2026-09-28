import os
import redis

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

if os.getenv("TRACKIT_STANDALONE") == "1":
    from pathlib import Path
    from .local_cache import LocalCache
    redis_client = LocalCache(Path(os.environ["TRACKIT_DATA_DIR"]) / "auth-cache.db")
else:
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
