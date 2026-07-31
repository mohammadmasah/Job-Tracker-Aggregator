import redis


redis_client = redis.Redis(
    host="localhost",
    port=6380,
    db=0,
    decode_responses=True
)