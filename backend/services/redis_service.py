import redis
import json
import os


class RedisService:
    def __init__(self):
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        # Use a lazy connection — do NOT ping on init.
        # This prevents ImportError when Redis is not yet running.
        try:
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=0,
                socket_connect_timeout=1,
            )
        except Exception as e:
            print(f"[RedisService] Failed to create Redis client: {e}")
            self.redis_client = None

    def publish_event(self, event_data: dict):
        if self.redis_client is None:
            return
        try:
            self.redis_client.publish("anomalies_stream", json.dumps(event_data, default=str))
        except Exception as e:
            print(f"[RedisService] Failed to publish event: {e}")


redis_service = RedisService()
