from celery.app import Celery
import os
from dotenv import load_dotenv

load_dotenv()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
celery_application = Celery(__name__, broker=redis_url, backend=redis_url)