from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

MONGO_URI = "mongodb://127.0.0.1:27017"
DB_NAME = "cognipath"

# Async client for FastAPI endpoints
_async_client = AsyncIOMotorClient(MONGO_URI)
async_db = _async_client[DB_NAME]

# Collection accessors
def get_tests_col():
    return async_db["tests"]

def get_kg_nodes_col():
    return async_db["kg_nodes"]

def get_submissions_col():
    return async_db["submissions"]
