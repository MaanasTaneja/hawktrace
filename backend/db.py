import os
from typing import Optional
from pymongo import MongoClient
from pymongo.collection import Collection

_client: Optional[MongoClient] = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    return _client


def flows_col() -> Collection:
    return get_client()["hawktrace"]["flows"]
