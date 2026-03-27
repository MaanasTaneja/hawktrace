import os
from pymongo import MongoClient
from pymongo.collection import Collection

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    return _client


#this is not good. we need to do it, user specific, like in each users foder we save flows.
#different project
def flows_col() -> Collection:
    return get_client()["hawktrace"]["flows"]
